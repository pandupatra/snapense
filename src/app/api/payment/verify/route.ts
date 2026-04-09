import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscription } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/payment/verify?intent={paymentIntentId}
 *
 * Verifies a payment intent token and returns the subscription status.
 * This ensures that only legitimate payment redirects can show the "processing" UI.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const intentId = searchParams.get("intent");

    if (!intentId) {
      return NextResponse.json(
        { error: "Missing intent token" },
        { status: 400 },
      );
    }

    // Find the subscription by paymentIntentId
    const subscriptionResult = await db
      .select()
      .from(subscription)
      .where(eq(subscription.paymentIntentId, intentId))
      .limit(1);

    if (!subscriptionResult[0]) {
      return NextResponse.json(
        { error: "Invalid intent token" },
        { status: 404 },
      );
    }

    const subRecord = subscriptionResult[0];

    // Verify the subscription belongs to the current user
    if (subRecord.userId !== session.user.id) {
      console.error(
        `[Payment Verify] User ${session.user.id} tried to access intent owned by ${subRecord.userId}`,
      );
      return NextResponse.json(
        { error: "Invalid intent token" },
        { status: 403 },
      );
    }

    // Check if subscription is still pending (not already processed)
    if (subRecord.status === "active") {
      // Already active - redirect to account page without processing UI
      return NextResponse.json({
        valid: true,
        alreadyProcessed: true,
        subscription: {
          id: subRecord.id,
          type: subRecord.type,
          status: subRecord.status,
          expiresAt: subRecord.expiresAt?.toISOString(),
          scansIncluded: subRecord.scansIncluded,
          scansUsed: subRecord.scansUsed,
        },
      });
    }

    // Valid pending intent - return subscription info for polling
    return NextResponse.json({
      valid: true,
      subscription: {
        id: subRecord.id,
        type: subRecord.type,
        status: subRecord.status,
        mayarOrderId: subRecord.mayarOrderId,
        expiresAt: subRecord.expiresAt?.toISOString(),
        scansIncluded: subRecord.scansIncluded,
        scansUsed: subRecord.scansUsed,
      },
    });
  } catch (error) {
    console.error("[Payment Verify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
