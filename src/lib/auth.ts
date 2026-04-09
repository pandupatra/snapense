import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendVerificationEmail, sendResetPasswordEmail } from "@/lib/email";
import { getConfig } from "@/lib/config";

interface User {
  email: string;
  name: string;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Changed to false - will handle verification manually
    sendResetPasswordToken: async ({ user, url }: { user: User; url: string }) => {
      await sendResetPasswordEmail(user.email, url);
    },
    sendVerificationEmail: async ({ user, url }: { user: User; url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: User; url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
  },
  socialProviders: {
    google: {
      clientId: getConfig().googleClientId,
      clientSecret: getConfig().googleClientSecret,
      scope: ["email", "profile"],
    },
  },
  baseURL: getConfig().betterAuthUrl,
});
