import { NextResponse } from "next/server";
import { getUserScanLimit } from "@/app/actions/subscription";

/**
 * GET /api/scan-limit
 * Returns the user's current scan limit information
 * Used by the ScanCounter component
 */
export async function GET() {
  try {
    const scanInfo = await getUserScanLimit();
    return NextResponse.json(scanInfo);
  } catch (error) {
    console.error("[/api/scan-limit] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan limit" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
