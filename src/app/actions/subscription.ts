"use server";

import { eq, and, count, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, scanUsage, subscription } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { ActionError, toActionError } from "@/lib/errors";
import { getCurrentWeekInfo, formatWeekIdentifier } from "@/lib/scan-limit";

export interface ScanLimitInfo {
  tier: "free" | "premium";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date;
  isPremium: boolean;
}

export interface UserSubscription {
  id: string;
  type: "weekly" | "monthly" | "scan_pack_10" | "scan_pack_25";
  status: "pending" | "active" | "expired" | "cancelled";
  startedAt: Date;
  expiresAt: Date;
  scansIncluded: number;
  scansUsed: number;
}

/**
 * Get user's scan limit information for the current week
 * Free users: 5 scans per week
 * Premium users: unlimited scans
 */
export async function getUserScanLimit(): Promise<ScanLimitInfo> {
  try {
    const session = await requireAuth();

    // Get user's current tier
    const userResult = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        premiumExpiresAt: users.premiumExpiresAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult[0]) {
      throw new ActionError("NOT_FOUND", "User not found");
    }

    const { subscriptionTier, premiumExpiresAt } = userResult[0];

    // Check if premium is still active
    const isPremium =
      subscriptionTier === "premium" &&
      (!premiumExpiresAt || premiumExpiresAt > new Date());

    // Premium users have unlimited scans
    if (isPremium) {
      const weekInfo = getCurrentWeekInfo();
      return {
        tier: "premium",
        limit: -1, // -1 indicates unlimited
        used: 0,
        remaining: -1,
        resetsAt: weekInfo.end,
        isPremium: true,
      };
    }

    // Free users: count scans in current week
    const weekInfo = getCurrentWeekInfo();

    const scanCountResult = await db
      .select({ count: count() })
      .from(scanUsage)
      .where(
        and(
          eq(scanUsage.userId, session.user.id),
          eq(scanUsage.weekIdentifier, weekInfo.identifier),
        ),
      );

    const used = scanCountResult[0]?.count || 0;
    const FREE_WEEKLY_LIMIT = 5;

    return {
      tier: "free",
      limit: FREE_WEEKLY_LIMIT,
      used,
      remaining: Math.max(0, FREE_WEEKLY_LIMIT - used),
      resetsAt: weekInfo.end,
      isPremium: false,
    };
  } catch (error) {
    console.error("[getUserScanLimit] Error:", error);
    throw toActionError(error, "Failed to fetch scan limit");
  }
}

/**
 * Record a new scan for the user
 * Should be called after a successful AI receipt scan
 */
export async function recordScan(): Promise<void> {
  try {
    const session = await requireAuth();

    // Get user's current tier to check if recording is needed
    const userResult = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        premiumExpiresAt: users.premiumExpiresAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult[0]) {
      throw new ActionError("NOT_FOUND", "User not found");
    }

    const { subscriptionTier, premiumExpiresAt } = userResult[0];

    // Check if premium is still active
    const isPremium =
      subscriptionTier === "premium" &&
      (!premiumExpiresAt || premiumExpiresAt > new Date());

    // For premium users, we still record scans for analytics/history
    // but we don't enforce limits
    const weekInfo = getCurrentWeekInfo();

    await db.insert(scanUsage).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      scannedAt: new Date(),
      weekIdentifier: weekInfo.identifier,
    });

    console.log(
      `[recordScan] Recorded scan for user ${session.user.id}, week ${weekInfo.identifier}, isPremium: ${isPremium}`,
    );
  } catch (error) {
    console.error("[recordScan] Error:", error);
    throw toActionError(error, "Failed to record scan");
  }
}

/**
 * Check if user has premium access
 * Returns true if user is on premium tier and subscription is active
 */
export async function checkPremiumAccess(): Promise<boolean> {
  try {
    const session = await requireAuth();

    const userResult = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        premiumExpiresAt: users.premiumExpiresAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult[0]) {
      return false;
    }

    const { subscriptionTier, premiumExpiresAt } = userResult[0];

    return (
      subscriptionTier === "premium" &&
      (!premiumExpiresAt || premiumExpiresAt > new Date())
    );
  } catch (error) {
    console.error("[checkPremiumAccess] Error:", error);
    return false;
  }
}

/**
 * Get user's active subscription details
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  try {
    const session = await requireAuth();

    const result = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, session.user.id))
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return {
      id: result[0].id,
      type: result[0].type,
      status: result[0].status,
      startedAt: new Date(result[0].startedAt),
      expiresAt: new Date(result[0].expiresAt),
      scansIncluded: result[0].scansIncluded ?? 0,
      scansUsed: result[0].scansUsed ?? 0,
    };
  } catch (error) {
    console.error("[getUserSubscription] Error:", error);
    throw toActionError(error, "Failed to fetch subscription");
  }
}

/**
 * Cancel user's active subscription
 */
export async function cancelSubscription(): Promise<void> {
  try {
    const session = await requireAuth();

    // Get active subscription
    const result = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, session.user.id),
          eq(subscription.status, "active"),
        ),
      )
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    if (!result[0]) {
      throw new ActionError("NOT_FOUND", "No active subscription found");
    }

    // Update subscription status to cancelled
    await db
      .update(subscription)
      .set({ status: "cancelled" })
      .where(eq(subscription.id, result[0].id));

    // Note: We don't downgrade the user immediately
    // They will lose premium access when the subscription expires naturally
    console.log(
      `[cancelSubscription] Cancelled subscription ${result[0].id} for user ${session.user.id}`,
    );
  } catch (error) {
    console.error("[cancelSubscription] Error:", error);
    throw toActionError(error, "Failed to cancel subscription");
  }
}
