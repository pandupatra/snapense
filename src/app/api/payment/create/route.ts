import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/app/actions/payment";
import type { PlanType } from "@/lib/pricing";

/**
 * POST /api/payment/create
 * Creates a payment link for a subscription plan
 * Body: { planType: "weekly" | "monthly" | "scan_pack_10" | "scan_pack_25" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planType } = body;

    if (!planType) {
      return NextResponse.json(
        { error: "planType is required" },
        { status: 400 },
      );
    }

    const validPlans: PlanType[] = [
      "weekly",
      "monthly",
      "scan_pack_10",
      "scan_pack_25",
    ];

    if (!validPlans.includes(planType as PlanType)) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 },
      );
    }

    const result = await createPayment(planType as PlanType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create payment" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("[/api/payment/create] Error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
