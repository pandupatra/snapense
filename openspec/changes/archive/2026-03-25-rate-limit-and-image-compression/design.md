# Design: Rate Limiting and Image Compression

## Part 1: Rate Limiter

### Algorithm: Sliding Window

```
Window: 60 seconds
Limit: 10 requests per window

User requests at: 0s, 10s, 25s, 40s, 55s, 70s
                   │    │    │    │    │    │
                   ▼    ▼    ▼    ▼    ▼    ▼

Time → 0    10   20   30   40   50   60   70
          █─────────────────────────────
          │████████████████████████████│  ← Window at t=55
                │████████████████████████│← Window at t=70

Count at t=55: 5 requests (all within window)
Count at t=70: 1 request (first one fell out)
```

### Data Structure

```typescript
// Store request timestamps per user per action type
type RequestLog = Map<string, number[]>; // userId + action -> timestamps

interface RateLimitConfig {
  windowMs: number;      // Time window (e.g., 60000ms)
  maxRequests: number;   // Max requests in window
}

const LIMITS: Record<string, RateLimitConfig> = {
  write: { windowMs: 60000, maxRequests: 10 },
  ai_scan: { windowMs: 60000, maxRequests: 30 },
  csv_import: { windowMs: 60000, maxRequests: 5 },
  auth: { windowMs: 60000, maxRequests: 5 },
};
```

### Implementation

```typescript
// src/lib/rate-limit.ts

const requestLogs = new Map<string, number[]>();

export class RateLimiter {
  constructor(
    private config: RateLimitConfig,
    private actionType: string
  ) {}

  async checkLimit(userId: string): Promise<{ allowed: boolean; resetAt?: Date }> {
    const key = `${this.actionType}:${userId}`;
    const now = Date.now();
    const { windowMs, maxRequests } = this.config;

    // Get existing log or create new
    let timestamps = requestLogs.get(key) || [];

    // Remove timestamps outside the window
    timestamps = timestamps.filter(t => now - t < windowMs);

    // Check if limit exceeded
    if (timestamps.length >= maxRequests) {
      // Find when oldest request expires
      const oldest = timestamps[0];
      return {
        allowed: false,
        resetAt: new Date(oldest + windowMs)
      };
    }

    // Add current request
    timestamps.push(now);
    requestLogs.set(key, timestamps);

    // Cleanup old entries periodically
    if (requestLogs.size > 10000) {
      this.cleanup();
    }

    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of requestLogs.entries()) {
      const recent = timestamps.filter(t => now - t < 300000); // 5 min
      if (recent.length === 0) {
        requestLogs.delete(key);
      } else {
        requestLogs.set(key, recent);
      }
    }
  }
}

export const rateLimiter = {
  write: new RateLimiter(LIMITS.write, 'write'),
  aiScan: new RateLimiter(LIMITS.ai_scan, 'ai_scan'),
  csvImport: new RateLimiter(LIMITS.csv_import, 'csv_import'),
  auth: new RateLimiter(LIMITS.auth, 'auth'),
};
```

### Error Types

```typescript
// src/lib/errors.ts - add to existing

export class RateLimitError extends ActionError {
  constructor(public resetAt: Date) {
    super(
      "RATE_LIMITED",
      `Too many requests. Try again after ${resetAt.toLocaleTimeString()}`,
      { resetAt: resetAt.toISOString() }
    );
  }
}
```

### Applying to Server Actions

```typescript
// src/app/actions/bills.ts

import { rateLimiter } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function createBill(data: BillFormData): Promise<BillSelect> {
  const session = await requireAuth();

  // Check rate limit
  const limit = await rateLimiter.write.checkLimit(session.user.id);
  if (!limit.allowed) {
    throw new RateLimitError(limit.resetAt!);
  }

  // ... rest of function
}

export async function extractReceiptData(imageData: string) {
  const session = await requireAuth();

  // Check rate limit (higher limit for AI)
  const limit = await rateLimiter.aiScan.checkLimit(session.user.id);
  if (!limit.allowed) {
    throw new RateLimitError(limit.resetAt!);
  }

  // ... rest of function
}
```

---

## Part 2: Client-Side Image Compression

### Utility Function

```typescript
// src/lib/image-compressor.ts (client-only)

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;      // 0.0 - 1.0
  maxSizeKB?: number;    // Target max size
}

export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.7,
    maxSizeKB = 200
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // White background for JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Compress iteratively until under size limit
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);

      // Check size and reduce quality if needed
      const targetBytes = maxSizeKB * 1024;
      while (result.length > targetBytes && currentQuality > 0.1) {
        currentQuality -= 0.1;
        result = canvas.toDataURL('image/jpeg', currentQuality);
      }

      resolve(result);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

### Update Bill Entry Dialog

```typescript
// src/components/bill-entry-dialog.tsx

import { compressImage } from "@/lib/image-compressor";

// In photo mode handler:
const handlePhotoCapture = async (photoData: string) => {
  try {
    // Compress before sending
    const compressed = await compressImage(photoData, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7,
      maxSizeKB: 200
    });

    console.log(`Compressed: ${photoData.length} → ${compressed.length} bytes`);

    // Send compressed data
    const result = await extractReceiptData(compressed);
    // ...
  } catch (error) {
    showError(error);
  }
};
```

### Remove Fake Compression

Remove the unused `compressBase64Image()` function from `bills.ts`.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/rate-limit.ts` | New | In-memory sliding window rate limiter |
| `src/lib/image-compressor.ts` | New | Client-side canvas compression |
| `src/lib/errors.ts` | Modify | Add `RateLimitError` class |
| `src/app/actions/bills.ts` | Modify | Add rate checks to write/AI operations |
| `src/components/bill-entry-dialog.tsx` | Modify | Compress images before sending |
| `src/app/api/export/sheets/route.ts` | Modify | Add rate limiting |
| `src/app/api/auth/[...all]/route.ts` | Modify | Add rate limiting to auth |

---

## Edge Cases Considered

1. **Server restart** - Rate limits reset (acceptable for this use case)
2. **Multiple server instances** - Each instance has independent limits (fine for PM2 single-server)
3. **Clock skew** - Not applicable (single server, Date.now())
4. **Memory leak** - Cleanup function removes old entries
5. **Canvas not available** - Only called from browser, safe
6. **Already small images** - Compression won't upscale
7. **Rate limit hit** - User gets clear error with retry time

---

## Migration Notes

- No database migrations required
- No breaking changes to API signatures
- UI needs to handle `RateLimitError` specifically
- Consider adding "retry after X seconds" button in UI
