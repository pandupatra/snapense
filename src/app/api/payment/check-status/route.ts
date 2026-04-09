import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscription, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { getPaymentStatus } from "@/lib/mayar";
import { calculateExpirationDate } from "@/lib/pricing";

/**
 * POST /api/payment/check-status
 *
 * Manually checks payment status with Mayar API.
 * This is used when webhook hasn't arrived yet or user wants to verify payment.
 *
 * Body: { mayarOrderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mayarOrderId } = body;

    if (!mayarOrderId) {
      return NextResponse.json(
        { error: "Missing mayarOrderId" },
        { status: 400 },
      );
    }

    // Find the subscription by Mayar order ID
    const subscriptionResult = await db
      .select()
      .from(subscription)
      .where(eq(subscription.mayarOrderId, mayarOrderId))
      .limit(1);

    if (!subscriptionResult[0]) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    const subRecord = subscriptionResult[0];

    // Verify ownership
    if (subRecord.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Already active - no need to check
    if (subRecord.status === "active") {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        subscription: {
          id: subRecord.id,
          type: subRecord.type,
          status: subRecord.status,
          expiresAt: subRecord.expiresAt?.toISOString(),
        },
      });
    }

    // Query Mayar API for payment status
    const result = await getPaymentStatus(mayarOrderId);

    if (!result.success || !result.status) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to check payment status",
      });
    }

    // If payment is paid, activate subscription
    if (result.status === "paid") {
      const { userId, type: planType } = subRecord;

      // Update subscription to active
      await db
        .update(subscription)
        .set({ status: "active" })
        .where(eq(subscription.id, subRecord.id));

      // For scan packs, add scans to user's quota
      // For subscriptions, upgrade user to premium
      if (planType === "scan_pack_10" || planType === "scan_pack_25") {
        console.log(
          `[Check Status] Activated scan pack ${planType} for user ${userId}`,
        );
      } else {
        // Weekly or monthly subscription - upgrade user to premium
        const expirationDate = calculateExpirationDate(
          planType as "weekly" | "monthly",
          new Date(),
        );

        await db
          .update(users)
          .set({
            subscriptionTier: "premium",
            premiumExpiresAt: expirationDate,
          })
          .where(eq(users.id, userId));

        console.log(
          `[Check Status] Upgraded user ${userId} to premium, expires ${expirationDate?.toISOString() || "never"}`,
        );
      }

      return NextResponse.json({
        success: true,
        paymentStatus: "paid",
        subscription: {
          id: subRecord.id,
          type: subRecord.type,
          status: "active",
          expiresAt: subRecord.expiresAt?.toISOString(),
        },
      });
    }

    // Payment not yet paid
    return NextResponse.json({
      success: true,
      paymentStatus: result.status, // "unpaid" or other
      message: "Payment not yet completed. Please wait a moment and try again.",
    });
  } catch (error) {
    console.error("[Check Payment Status] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
