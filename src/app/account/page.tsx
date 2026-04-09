import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { AccountPageClient } from "./account-client";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscription, users } from "@/db/schema";

interface AccountPageProps {
  searchParams: Promise<{ payment?: string; intent?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireAuth();

  if (!session) {
    redirect("/login");
  }

  // Fetch user data from database to get subscription tier
  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userData[0] || {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: null,
    subscriptionTier: "free" as const,
    premiumExpiresAt: null,
  };

  // Await searchParams as it's now a Promise in Next.js 15+
  const params = await searchParams;

  // Verify payment intent if present
  let paymentIntentVerified = false;
  let mayarOrderId: string | null = null;

  if (params.payment === "pending" && params.intent) {
    // Verify the intent token belongs to this user
    const subRecord = await db
      .select()
      .from(subscription)
      .where(eq(subscription.paymentIntentId, params.intent))
      .limit(1);

    if (subRecord[0] && subRecord[0].userId === session.user.id) {
      paymentIntentVerified = true;
      mayarOrderId = subRecord[0].mayarOrderId;
      console.log(
        `[Account Page] Payment intent verified for subscription ${subRecord[0].id}`,
      );
    } else {
      // Invalid intent - redirect to clean account page
      console.log(
        `[Account Page] Invalid payment intent, redirecting to clean account page`,
      );
      redirect("/account");
    }
  }

  return (
    <AccountPageClient
      userId={session.user.id}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      subscriptionTier={user.subscriptionTier}
      premiumExpiresAt={user.premiumExpiresAt?.toISOString() ?? null}
      paymentIntentVerified={paymentIntentVerified}
      mayarOrderId={mayarOrderId}
    />
  );
}
