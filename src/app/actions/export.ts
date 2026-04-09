"use server";

import { requireAuth } from "@/lib/auth-utils";
import { requirePremium } from "@/lib/require-premium";
import { toActionError } from "@/lib/errors";

/**
 * Check if user can export (premium feature)
 * Throws error if user is not premium
 */
export async function checkExportAccess(): Promise<{ success: boolean }> {
  try {
    const session = await requireAuth();
    await requirePremium(session.user.id);
    return { success: true };
  } catch (error) {
    throw toActionError(error, "Export access check failed");
  }
}
