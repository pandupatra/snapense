import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { scanUsage } from "@/db/schema";

/**
 * GET /api/scan-history
 * Returns the user's scan history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get scan history, most recent first
    const history = await db
      .select({
        scannedAt: scanUsage.scannedAt,
        weekIdentifier: scanUsage.weekIdentifier,
      })
      .from(scanUsage)
      .where(eq(scanUsage.userId, session.user.id))
      .orderBy(desc(scanUsage.scannedAt))
      .limit(100);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[/api/scan-history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
