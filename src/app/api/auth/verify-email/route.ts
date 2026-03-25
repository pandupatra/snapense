import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifications, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
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
