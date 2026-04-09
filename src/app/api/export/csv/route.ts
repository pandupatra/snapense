import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { rateLimiter } from "@/lib/rate-limit";
import { requirePremium } from "@/lib/require-premium";
import { isActionError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check rate limit for export operations
    const limit = await rateLimiter.write.checkLimit(session.user.id);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: limit.resetAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    // Check premium access for export
    try {
      await requirePremium(session.user.id);
    } catch (error) {
      if (isActionError(error)) {
        return NextResponse.json(
          {
            error: error.message,
            requiresPremium: true,
          },
          { status: 402 }
        );
      }
      throw error;
    }

    // Fetch all user bills
    const userBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, session.user.id))
      .orderBy(desc(bills.transactionDate));

    // Format as CSV
    const headers = ["Date", "Amount", "Currency", "Category", "Merchant", "Description"];
    const rows = userBills.map((bill) => [
      new Date(bill.transactionDate).toISOString().split("T")[0],
      bill.amount.toString(),
      bill.currency,
      bill.category,
      bill.merchant || "",
      bill.description || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return NextResponse.json({
      success: true,
      csvContent,
      filename: `bills-${new Date().toISOString().split("T")[0]}.csv`,
    });
  } catch (error: any) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export to CSV" },
      { status: 500 }
    );
  }
}
