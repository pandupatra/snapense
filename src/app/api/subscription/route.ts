import { NextResponse } from "next/server";
import { getUserSubscription } from "@/app/actions/subscription";

/**
 * GET /api/subscription
 * Returns the user's subscription information
 */
export async function GET() {
  try {
    const subscription = await getUserSubscription();
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[/api/subscription] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
