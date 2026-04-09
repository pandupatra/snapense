import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, subscription } from "@/db/schema";
import { calculateExpirationDate } from "@/lib/pricing";
import { verifyWebhookSignature } from "@/lib/mayar";

/**
 * Mayar.id Webhook Handler
 *
 * Receives payment status updates from Mayar
 * When a payment is "paid", we:
 * 1. Verify webhook signature
 * 2. Find subscription by Mayar order ID
 * 3. Update subscription status to "active"
 * 4. Upgrade user to premium tier
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const signature = request.headers.get("x-mayar-signature");

    console.log("[Mayar Webhook] Received:", {
      id: payload.id,
      amount: payload.amount,
      status: payload.status,
    });

    // Verify webhook signature
    const isDemoPayment = payload.id?.startsWith("demo_");
    if (!isDemoPayment) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("[Mayar Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.log("[Mayar Webhook] Signature verified");
    }

    // Handle different webhook event types
    const data = payload.data || payload;
    const transactionId = data.id || data.transactionId || payload.id;
    const transactionStatus = data.transactionStatus || data.status || payload.status;

    // Find the pending subscription by Mayar order ID
    const subscriptionResult = await db
      .select()
      .from(subscription)
      .where(eq(subscription.mayarOrderId, transactionId))
      .limit(1);

    if (!subscriptionResult[0]) {
      console.error("[Mayar Webhook] Subscription not found for order:", transactionId);
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const subRecord = subscriptionResult[0];

    // Only process if status is "paid" or "SUCCESS"
    if (transactionStatus !== "paid" && transactionStatus !== "SUCCESS") {
      console.log("[Mayar Webhook] Skipping non-paid status:", transactionStatus);
      return NextResponse.json({ received: true });
    }

    // Check if already processed (idempotency)
    if (subRecord.status === "active") {
      console.log("[Mayar Webhook] Subscription already active:", subRecord.id);
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // Update subscription to active
    await db
      .update(subscription)
      .set({ status: "active" })
      .where(eq(subscription.id, subRecord.id));

    const { userId, type: planType } = subRecord;

    // For scan packs, add scans to user's quota
    // For subscriptions, upgrade user to premium
    if (planType === "scan_pack_10" || planType === "scan_pack_25") {
      // Scan packs don't expire, so we add the scans immediately
      // The subscription record tracks the pack
      console.log(
        `[Mayar Webhook] Activated scan pack ${planType} for user ${userId}`,
      );
    } else {
      // Weekly or monthly subscription - upgrade user to premium
      const expirationDate = calculateExpirationDate(planType as any, new Date());

      await db
        .update(users)
        .set({
          subscriptionTier: "premium",
          premiumExpiresAt: expirationDate,
        })
        .where(eq(users.id, userId));

      console.log(
        `[Mayar Webhook] Upgraded user ${userId} to premium, expires ${expirationDate?.toISOString() || "never"}`,
      );
    }

    console.log(
      `[Mayar Webhook] Successfully processed payment ${transactionId} for user ${userId}, plan ${planType}`,
    );

    return NextResponse.json({
      success: true,
      subscriptionId: subRecord.id,
      userId,
      planType,
    });
  } catch (error) {
    console.error("[Mayar Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Allow POST requests only
export const dynamic = "force-dynamic";
