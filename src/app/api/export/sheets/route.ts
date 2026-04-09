import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/index';
import { bills } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createSpreadsheetWithAuth } from '@/lib/google-sheets';
import { rateLimiter } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';
import { requirePremium } from '@/lib/require-premium';
import { isActionError } from '@/lib/errors';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check rate limit for export operations
    const limit = await rateLimiter.write.checkLimit(session.user.id);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
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

    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Fetch all user bills
    const userBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, session.user.id))
      .orderBy(desc(bills.transactionDate));

    // Format for Sheets
    const billsForSheets = userBills.map((bill) => ({
      no: 0, // Will be set when creating rows
      transactionDate: new Date(bill.transactionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      merchant: bill.merchant,
      amount: bill.amount,
      currency: bill.currency,
      notes: bill.description,
      createdDate: new Date(bill.createdAt || '').toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    }));

    // Create spreadsheet and get ID
    const spreadsheetId = await createSpreadsheetWithAuth(accessToken, billsForSheets);

    return NextResponse.json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (error: any) {
    console.error('Sheets export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export to Google Sheets' },
      { status: 500 }
    );
  }
}
