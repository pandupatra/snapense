# Design: Subscription & Monetization System

## 1. Database Schema Changes

### Users Table - Add Columns

```sql
-- Add to existing users table
ALTER TABLE user ADD COLUMN subscriptionTier TEXT DEFAULT 'free';
ALTER TABLE user ADD COLUMN premiumExpiresAt INTEGER;
ALTER TABLE user ADD COLUMN scanResetDay INTEGER; -- Day of year for weekly reset (0-365)
```

### New Tables

```sql
-- Scan tracking table
CREATE TABLE scan_usage (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  scannedAt INTEGER NOT NULL,
  weekIdentifier TEXT NOT NULL, -- Format: "YYYY-Www" (e.g., "2025-W12")
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_scan_usage_user_week ON scan_usage(userId, weekIdentifier);

-- Subscriptions table
CREATE TABLE subscription (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL, -- 'weekly', 'monthly', 'scan_pack_10', 'scan_pack_25'
  status TEXT NOT NULL, -- 'pending', 'active', 'expired', 'cancelled'
  mayarOrderId TEXT,
  startedAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  scansIncluded INTEGER DEFAULT 0, -- For scan packs
  scansUsed INTEGER DEFAULT 0,      -- For scan packs
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_user_status ON subscription(userId, status);
```

---

## 2. Scan Limiting Logic

### Rolling Week Calculation

```typescript
// src/lib/scan-limit.ts

interface WeekInfo {
  identifier: string;  // "2025-W12"
  start: Date;
  end: Date;
}

function getCurrentWeekInfo(): WeekInfo {
  const now = new Date();
  const year = now.getFullYear();

  // Get week number (1-53)
  const oneJan = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const weekNumber = Math.ceil(dayOfYear / 7);

  return {
    identifier: `${year}-W${weekNumber}`,
    start: getWeekStart(now),
    end: getWeekEnd(now),
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
```

### Scan Counter with Cache

```typescript
// src/app/actions/subscription.ts

export async function getUserScanLimit(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  weekStart: Date;
  weekEnd: Date;
  isPremium: boolean;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  const isPremium = user?.subscriptionTier === 'premium' &&
    (!user?.premiumExpiresAt || user.premiumExpiresAt > Date.now());

  if (isPremium) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      weekStart: new Date(),
      weekEnd: new Date(),
      isPremium: true,
    };
  }

  const weekInfo = getCurrentWeekInfo();

  const scans = await db
    .select()
    .from(scanUsage)
    .where(
      and(
        eq(scanUsage.userId, userId),
        eq(scanUsage.weekIdentifier, weekInfo.identifier)
      )
    );

  return {
    used: scans.length,
    limit: 5,
    remaining: Math.max(0, 5 - scans.length),
    weekStart: weekInfo.start,
    weekEnd: weekInfo.end,
    isPremium: false,
  };
}

export async function recordScan(userId: string): Promise<void> {
  const weekInfo = getCurrentWeekInfo();

  await db.insert(scanUsage).values({
    id: crypto.randomUUID(),
    userId,
    scannedAt: Date.now(),
    weekIdentifier: weekInfo.identifier,
  });
}
```

---

## 3. Mayar.id Integration

### API Endpoints

```typescript
// Mayar.id API base URL
const MAYAR_API_URL = 'https://api.mayar.id/v1';

// Payment creation
interface MayarPaymentRequest {
  external_id: string;
  amount: number;
  description: string;
  expire_at?: string;
  type: 'qris' | 'ewallet' | 'virtual_account';
  buyer_email_opt?: string;
  buyer_phone_opt?: string;
}

interface MayarPaymentResponse {
  id: string;
  external_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  payment_url: string;
  expired_at?: string;
}
```

### Price Configuration

```typescript
// src/lib/pricing.ts
export const PRICING = {
  weekly: {
    amount: 5000,
    name: 'Premium Weekly',
    description: 'Snapense Premium - 1 Minggu',
    durationDays: 7,
  },
  monthly: {
    amount: 15000,
    name: 'Premium Monthly',
    description: 'Snapense Premium - 1 Bulan',
    durationDays: 30,
  },
  scanPack10: {
    amount: 10000,
    name: '10 Scan Pack',
    description: 'Snapense - 10 Kali Scan',
    scansIncluded: 10,
  },
  scanPack25: {
    amount: 25000,
    name: '25 Scan Pack',
    description: 'Snapense - 25 Kali Scan',
    scansIncluded: 25,
  },
} as const;
```

### Payment Creation

```typescript
// src/app/actions/payment.ts

export async function createPayment(
  planType: 'weekly' | 'monthly' | 'scanPack10' | 'scanPack25',
  userId: string
): Promise<{ paymentUrl: string; subscriptionId: string }> {
  const session = await requireAuth();

  if (session.user.id !== userId) {
    throw new ActionError("UNAUTHORIZED", "Unauthorized");
  }

  const pricing = PRICING[planType];
  const externalId = `snapense-${planType}-${userId}-${Date.now()}`;

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pricing.durationDays);

  // Create subscription record
  const subscription = await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    type: planType,
    status: 'pending',
    startedAt: Date.now(),
    expiresAt: expiresAt.getTime(),
    scansIncluded: pricing.scansIncluded || 0,
  }).returning();

  // Create payment request to Mayar
  const paymentRequest: MayarPaymentRequest = {
    external_id: subscription.id,
    amount: pricing.amount,
    description: pricing.description,
    type: 'qris', // Can be dynamic based on user selection
  };

  const response = await fetch(`${MAYAR_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ActionError("INTERNAL", `Payment creation failed: ${error}`);
  }

  const payment: MayarPaymentResponse = await response.json();

  // Update subscription with Mayar order ID
  await db.update(subscriptions)
    .set({ mayarOrderId: payment.id })
    .where(eq(subscriptions.id, subscription.id));

  return {
    paymentUrl: payment.payment_url,
    subscriptionId: subscription.id,
  };
}
```

---

## 4. Webhook Handler

```typescript
// src/app/api/mayar/webhook/route.ts

import { headers } from 'next/headers';
import { verifySignature } from '@/lib/mayar';
import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = async (req: NextRequest) => {
  try {
    // Verify Mayar signature
    const body = await req.text();
    const signature = req.headers.get('x-mayar-signature');

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle payment paid event
    if (event.status === 'paid' && event.payment_type === 'payment') {
      // Find subscription by Mayar order ID
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.mayarOrderId, event.external_id)
      });

      if (!subscription) {
        console.error('Subscription not found for order:', event.external_id);
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      // Update subscription status
      await db.update(subscriptions)
        .set({
          status: 'active',
          startedAt: Date.now(),
        })
        .where(eq(subscriptions.id, subscription.id));

      // Update user tier
      await db.update(users)
        .set({
          subscriptionTier: 'premium',
          premiumExpiresAt: subscription.expiresAt,
        })
        .where(eq(users.id, subscription.userId));

      console.log(`User ${subscription.userId} upgraded to premium`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
};
```

---

## 5. UI Changes

### Scan Counter Display

```typescript
// src/components/scan-counter.tsx

export function ScanCounter() {
  const { data: scanData } = useQuery({
    queryKey: ['scan-limit'],
    queryFn: () => getScanLimit(),
  });

  if (scanData?.isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
        <span className="text-sm font-semibold text-cyan-400">⭐ Premium</span>
        <span className="text-xs text-muted-foreground">Unlimited scans</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {scanData.remaining} / {scanData.limit} scans
      </span>
      <span className="text-xs text-muted-foreground">
        this week
      </span>
      {scanData.remaining <= 1 && (
        <span className="text-xs text-amber-500">Low!</span>
      )}
    </div>
  );
}
```

### Upgrade Prompt

```typescript
// src/components/upgrade-prompt.tsx

export function UpgradePrompt({ remainingScans }: { remainingScans: number }) {
  const [isOpen, setIsOpen] = useState(false);

  if (remainingScans > 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You've reached your weekly scan limit!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Upgrade to Premium to unlock unlimited receipt scans, export features,
            and advanced analytics.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <PricingCard
              name="Weekly"
              price="Rp 5.000"
              period="/week"
              features={['7 days access', 'Unlimited scans', 'Export features']}
              planType="weekly"
            />
            <PricingCard
              name="Monthly"
              price="Rp 15.000"
              period="/month"
              features={['30 days access', 'Unlimited scans', 'Best value']}
              planType="monthly"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Export Gating

```typescript
// src/app/actions/export.ts

import { requireAuth } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requirePremium() {
  const session = await requireAuth();

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) {
    throw new ActionError("UNAUTHORIZED", "User not found");
  }

  const isPremium = user.subscriptionTier === 'premium' &&
    (!user.premiumExpiresAt || user.premiumExpiresAt > Date.now());

  if (!isPremium) {
    throw new ActionError(
      "PREMIUM_REQUIRED",
      "This feature requires a Premium subscription"
    );
  }

  return session;
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/db/schema.ts` | Modify | Add subscription columns to users table, new tables |
| `src/lib/scan-limit.ts` | New | Scan counter logic with rolling week |
| `src/lib/pricing.ts` | New | Price configurations |
| `src/lib/mayar.ts` | New | Mayar.id API client & signature verification |
| `src/app/actions/subscription.ts` | New | Subscription & scan limit queries |
| `src/app/actions/payment.ts` | New | Payment creation for Mayar.id |
| `src/app/api/mayar/webhook/route.ts` | New | Webhook handler for payment callbacks |
| `src/components/scan-counter.tsx` | New | UI component showing scan count |
| `src/components/upgrade-prompt.tsx` | New | Upgrade prompt dialog |
| `src/components/pricing-cards.tsx` | New | Pricing plan selection UI |
| `src/components/plan-management.tsx` | New | User's subscription management page |
| `src/app/actions/export.ts` | New | Export functions with premium check |
| `src/app/page.tsx` | Modify | Add scan counter, upgrade prompts |
| `src/app/actions/bills.ts` | Modify | Check scan limit in extractReceiptData |

---

## Edge Cases

1. **Scan pack users** - Need separate counter for purchased scans
2. **Subscription overlap** - User subscribes while active - extend expiration
3. **Payment failure** - Subscription remains 'pending', no access granted
4. **Refunds** - Manual process, downgrade user and refund via Mayar dashboard
5. **Week boundary** - Scans reset automatically on new rolling week
6. **Existing users** - Give 1 week grace period on launch
7. **Expired premium** - Auto-downgrade to free, keep all data
8. **Scan at exactly reset time** - Handle edge case where week rolls over during scan
