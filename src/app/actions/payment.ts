"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscription, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { ActionError, toActionError } from "@/lib/errors";
import type { PlanType } from "@/lib/pricing";
import {
  createMayarPayment,
  calculatePaymentExpiration,
} from "@/lib/mayar";

export interface PaymentResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
  errorType?: "payment_gateway" | "network" | "config";
}

/**
 * Create a payment link for a subscription plan
 * Creates a pending subscription record and returns the payment URL
 */
export async function createPayment(
  planType: PlanType,
): Promise<PaymentResult> {
  try {
    const session = await requireAuth();

    // Get user details for Mayar
    const userResult = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      return {
        success: false,
        error: "User not found",
        errorType: "config",
      };
    }

    // Get plan details
    const { getPlanDetails } = await import("@/lib/pricing");
    const plan = getPlanDetails(planType);

    // Calculate expiration (24 hours from now)
    const expiredAt = calculatePaymentExpiration(24);

    // Create payment via Mayar with required fields
    const paymentIntentId = crypto.randomUUID(); // For secure redirect verification
    const mayarResponse = await createMayarPayment({
      amount: plan.price,
      description: `Bill Tracker ${plan.name}`,
      expiredAt,
      name: user.name || "User",
      email: user.email,
      mobile: "08123456789", // Default mobile - consider adding to user schema
      redirectUrl: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/account?payment=pending&intent=${paymentIntentId}`,
    });

    if (!mayarResponse.success || !mayarResponse.data) {
      console.error("[createPayment] Mayar API failed:", mayarResponse.error);

      // Return detailed error instead of throwing
      const errorMsg = mayarResponse.error || "Failed to create payment";
      const isConfigError = errorMsg.toLowerCase().includes("not configured");
      const isNetworkError = errorMsg.toLowerCase().includes("network") ||
                              errorMsg.toLowerCase().includes("fetch");

      return {
        success: false,
        error: isConfigError
          ? "Payment gateway is not configured. Please contact support."
          : isNetworkError
            ? "Unable to connect to payment gateway. Please check your connection and try again."
            : `Payment gateway error: ${errorMsg}`,
        errorType: isConfigError ? "config" : isNetworkError ? "network" : "payment_gateway",
      };
    }

    // Create pending subscription record
    const subscriptionId = crypto.randomUUID();
    const now = new Date();

    // Calculate subscription expiration based on plan type
    const { calculateExpirationDate } = await import("@/lib/pricing");
    const subscriptionExpiresAt = calculateExpirationDate(planType, now);

    await db.insert(subscription).values({
      id: subscriptionId,
      userId: session.user.id,
      type: planType,
      status: "pending",
      mayarOrderId: mayarResponse.data.id,
      paymentIntentId,
      startedAt: now,
      expiresAt: subscriptionExpiresAt || now, // For scan packs, use now as placeholder
      scansIncluded: plan.scansIncluded === -1 ? -1 : plan.scansIncluded,
      scansUsed: 0,
    });

    console.log(
      `[createPayment] Created payment ${subscriptionId} for user ${session.user.id}, plan ${planType}`,
    );

    return {
      success: true,
      checkoutUrl: mayarResponse.data.checkoutUrl,
    };
  } catch (error) {
    console.error("[createPayment] Error:", error);

    // Return error instead of throwing for better client-side handling
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      errorType: "network",
    };
  }
}

/**
 * Check if user has an active premium subscription
 * If expired, downgrade to free tier
 */
export async function checkAndRefreshSubscription(): Promise<{
  isPremium: boolean;
  expiresAt: Date | null;
}> {
  try {
    const session = await requireAuth();

    // Get user's current tier and expiration
    const userResult = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        premiumExpiresAt: users.premiumExpiresAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult[0]) {
      return { isPremium: false, expiresAt: null };
    }

    const { subscriptionTier, premiumExpiresAt } = userResult[0];

    // Check if subscription has expired
    if (
      subscriptionTier === "premium" &&
      premiumExpiresAt &&
      premiumExpiresAt <= new Date()
    ) {
      // Downgrade to free tier
      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          premiumExpiresAt: null,
        })
        .where(eq(users.id, session.user.id));

      console.log(
        `[checkAndRefreshSubscription] Downgraded user ${session.user.id} to free tier`,
      );

      return { isPremium: false, expiresAt: null };
    }

    return {
      isPremium: subscriptionTier === "premium",
      expiresAt: premiumExpiresAt,
    };
  } catch (error) {
    console.error("[checkAndRefreshSubscription] Error:", error);
    return { isPremium: false, expiresAt: null };
  }
}
