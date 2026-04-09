import { ActionError } from "./errors";

/**
 * Check if user has premium access
 * Throws an error if user is not premium
 *
 * Use this function to gate premium features like:
 * - Export to CSV
 * - Export to Google Sheets
 * - Advanced analytics (future)
 *
 * @throws ActionError with code "UNAUTHORIZED" if user is not premium
 */
export async function requirePremium(userId: string): Promise<void> {
  const { checkPremiumAccess } = await import("@/app/actions/subscription");
  const isPremium = await checkPremiumAccess();

  if (!isPremium) {
    throw new ActionError(
      "UNAUTHORIZED",
      "Export to CSV and Google Sheets is a Premium feature. Upgrade to Premium to unlock all features.",
    );
  }
}
