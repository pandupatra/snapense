# Design: Fix Critical Issues

## 1. Chart Date Sorting Fix

### Current Problem
```typescript
// page.tsx:96-97
const dateA = new Date(a.day + ", 2024");
const dateB = new Date(b.day + ", 2024");
```

The hardcoding of "2024" causes incorrect sorting in 2025+.

### Solution

Parse the day string (format: "MMM d") with the current year context:

```typescript
function generateChartData(bills: Bill[]): DailySpending[] {
  const dailyTotals = new Map<string, number>();

  bills.forEach((bill) => {
    const dateKey = format(new Date(bill.transactionDate), "MMM d");
    const current = dailyTotals.get(dateKey) || 0;
    dailyTotals.set(dateKey, current + bill.amount);
  });

  const currentYear = new Date().getFullYear();

  const sortedData = Array.from(dailyTotals.entries())
    .map(([day, amount]) => ({ day, amount }))
    .sort((a, b) => {
      const dateA = new Date(`${a.day}, ${currentYear}`);
      const dateB = new Date(`${b.day}, ${currentYear}`);
      return dateA.getTime() - dateB.getTime();
    });

  return sortedData;
}
```

**Edge case considered**: Data spanning across year boundary (Dec 2024 - Jan 2025). For a minimal fix, we use current year. A more sophisticated solution could infer year from bill dates, but that's out of scope for Phase 1.

---

## 2. Error Handling Architecture

### Current Problem
All server actions catch errors and return null/empty:

```typescript
} catch (error) {
  console.error("[getBills] Error:", error);
  return { bills: [], hasMore: false };
}
```

UI cannot distinguish between "no bills exist" and "database is down".

### Solution: Structured Error Types

Create a new error type system:

```typescript
// src/lib/errors.ts
export class ActionError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "INTERNAL" | "NETWORK",
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export function isActionError(error: unknown): error is ActionError {
  return error instanceof ActionError;
}
```

Update server actions to throw `ActionError` instead of returning null:

```typescript
// Before
export async function createBill(data: BillFormData): Promise<BillSelect | null> {
  try {
    // ...
  } catch (error) {
    console.error("Error creating bill:", error);
    return null;
  }
}

// After
export async function createBill(data: BillFormData): Promise<BillSelect> {
  try {
    // ...
    return newBill as BillSelect;
  } catch (error) {
    console.error("Error creating bill:", error);
    throw new ActionError("INTERNAL", "Failed to create bill", error);
  }
}
```

### UI Error Display

Create error boundary and toast notifications:

```typescript
// components/error-toast.tsx (new)
export function useActionErrors() {
  const [error, setError] = useState<string | null>(null);

  const execute = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      if (isActionError(e)) {
        setError(e.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return { error, execute, clear: () => setError(null) };
}
```

---

## 3. Environment Variable Validation

### Current Problem
```typescript
// auth.ts:41-42
clientId: process.env.GOOGLE_CLIENT_ID as string,
clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
```

If undefined, runtime errors occur with cryptic messages.

### Solution: Startup Validation

```typescript
// src/lib/config.ts (new)
interface EnvConfig {
  betterAuthUrl: string;
  betterAuthSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  geminiApiKey: string;
  geminiModel: string;
}

const REQUIRED_ENV_VARS: Record<keyof EnvConfig, string> = {
  betterAuthUrl: "BETTER_AUTH_URL",
  betterAuthSecret: "BETTER_AUTH_SECRET",
  googleClientId: "GOOGLE_CLIENT_ID",
  googleClientSecret: "GOOGLE_CLIENT_SECRET",
  geminiApiKey: "GEMINI_API_KEY",
  geminiModel: "GEMINI_MODEL",
} as const;

function validateEnv(): EnvConfig {
  const config: Partial<EnvConfig> = {};
  const missing: string[] = [];

  for (const [key, envVar] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else {
      (config[key as keyof EnvConfig] as string) = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\n` +
      `Please set these in your .env.local file.`
    );
  }

  return config as EnvConfig;
}

// Singleton - validates once at startup
let _config: EnvConfig | null = null;
export function getConfig(): EnvConfig {
  if (!_config) {
    _config = validateEnv();
  }
  return _config;
}
```

Update auth.ts to use validated config:

```typescript
import { getConfig } from "@/lib/config";

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: getConfig().googleClientId,
      clientSecret: getConfig().googleClientSecret,
      // ...
    },
  },
  // ...
});
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/errors.ts` | New | Error type definitions |
| `src/lib/config.ts` | New | Env validation helper |
| `src/app/page.tsx` | Modify | Fix chart date sorting |
| `src/app/actions/bills.ts` | Modify | Throw ActionError instead of returning null |
| `src/lib/auth.ts` | Modify | Use getConfig() for OAuth credentials |
| `src/components/error-toast.tsx` | New | UI error display component |
| `src/app/layout.tsx` | Modify | Import config to fail fast on startup |

---

## Migration Notes

- Existing code calling server actions will need to handle thrown errors
- UI components will need to be updated to display error toasts
- No database migrations required
