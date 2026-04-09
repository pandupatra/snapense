import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifications, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { rateLimiter } from "@/lib/rate-limit";

// Simple IP-based rate limit key generator for unauthenticated endpoints
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit for email verification
    const clientId = getClientIdentifier(request);
    const limit = await rateLimiter.auth.checkLimit(clientId);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please try again later.',
          resetAt: limit.resetAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    // Find the verification record
    const verificationRecords = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.identifier, email),
          eq(verifications.value, token),
          gt(verifications.expiresAt, new Date())
        )
      )
      .limit(1);

    const verification = verificationRecords[0];

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email));

    // Delete the verification record
    await db
      .delete(verifications)
      .where(eq(verifications.id, verification.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility
export async function POST(request: NextRequest) {
  try {
    // Check rate limit for email verification
    const clientId = getClientIdentifier(request);
    const limit = await rateLimiter.auth.checkLimit(clientId);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please try again later.',
          resetAt: limit.resetAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    // Find the verification record
    const verificationRecords = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.identifier, email),
          eq(verifications.value, token),
          gt(verifications.expiresAt, new Date())
        )
      )
      .limit(1);

    const verification = verificationRecords[0];

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    // Update user's email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email));

    // Delete the verification record
    await db
      .delete(verifications)
      .where(eq(verifications.id, verification.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}
