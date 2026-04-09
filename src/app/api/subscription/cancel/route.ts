import { NextResponse } from "next/server";
import { cancelSubscription } from "@/app/actions/subscription";

/**
 * POST /api/subscription/cancel
 * Cancels the user's active subscription
 */
export async function POST() {
  try {
    await cancelSubscription();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/subscription/cancel] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
