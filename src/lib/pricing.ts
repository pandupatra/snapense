/**
 * Pricing configuration for Snapense subscription plans
 * All prices in Indonesian Rupiah (IDR)
 */

export type PlanType = "weekly" | "monthly" | "scan_pack_10" | "scan_pack_25";

export interface PlanDetails {
  id: PlanType;
  name: string;
  description: string;
  price: number;
  priceFormatted: string;
  duration: number; // in days, 0 for one-time scan packs
  scansIncluded: number;
  features: string[];
  isPopular?: boolean;
}

export const PLANS: Record<PlanType, PlanDetails> = {
  weekly: {
    id: "weekly",
    name: "Premium Weekly",
    description: "Unlimited scans for 7 days",
    price: 5000,
    priceFormatted: "Rp 5.000",
    duration: 7,
    scansIncluded: -1, // -1 indicates unlimited
    features: [
      "Unlimited AI receipt scans",
      "Export to CSV & Google Sheets",
      "Priority support",
    ],
  },
  monthly: {
    id: "monthly",
    name: "Premium Monthly",
    description: "Best value - 30 days of unlimited scans",
    price: 15000,
    priceFormatted: "Rp 15.000",
    duration: 30,
    scansIncluded: -1,
    features: [
      "Unlimited AI receipt scans",
      "Export to CSV & Google Sheets",
      "Priority support",
      "Save 50% compared to weekly",
    ],
    isPopular: true,
  },
  scan_pack_10: {
    id: "scan_pack_10",
    name: "Scan Pack (10)",
    description: "One-time pack of 10 extra scans",
    price: 10000,
    priceFormatted: "Rp 10.000",
    duration: 0, // One-time purchase, no expiration
    scansIncluded: 10,
    features: [
      "10 extra AI receipt scans",
      "No expiration",
      "Use whenever you need",
    ],
  },
  scan_pack_25: {
    id: "scan_pack_25",
    name: "Scan Pack (25)",
    description: "Best value one-time pack",
    price: 20000,
    priceFormatted: "Rp 20.000",
    duration: 0,
    scansIncluded: 25,
    features: [
      "25 extra AI receipt scans",
      "No expiration",
      "Save 20% compared to 10-pack",
    ],
  },
};

/**
 * Free tier configuration
 */
export const FREE_TIER = {
  scansPerWeek: 5,
  features: [
    "5 AI receipt scans per week",
    "Manual bill entry",
    "Basic charts",
  ],
};

/**
 * Get plan details by plan type
 */
export function getPlanDetails(planType: PlanType): PlanDetails {
  return PLANS[planType];
}

/**
 * Get all subscription plans (weekly, monthly)
 */
export function getSubscriptionPlans(): PlanDetails[] {
  return [PLANS.weekly, PLANS.monthly];
}

/**
 * Get all scan pack plans
 */
export function getScanPackPlans(): PlanDetails[] {
  return [PLANS.scan_pack_10, PLANS.scan_pack_25];
}

/**
 * Get all available plans
 */
export function getAllPlans(): PlanDetails[] {
  return Object.values(PLANS);
}

/**
 * Calculate expiration date for a plan
 * @param planType - The plan type
 * @param startDate - The start date (defaults to now)
 * @returns The expiration date or null if no expiration
 */
export function calculateExpirationDate(
  planType: PlanType,
  startDate: Date = new Date(),
): Date | null {
  const plan = PLANS[planType];

  if (plan.duration === 0) {
    // Scan packs don't expire
    return null;
  }

  const expiration = new Date(startDate);
  expiration.setDate(expiration.getDate() + plan.duration);
  return expiration;
}

/**
 * Format price for display
 */
export function formatPrice(amountInRupiah: number): string {
  return `Rp ${amountInRupiah.toLocaleString("id-ID")}`;
}

/**
 * Check if a plan is a subscription (recurring) vs one-time purchase
 */
export function isSubscriptionPlan(planType: PlanType): boolean {
  return planType === "weekly" || planType === "monthly";
}

/**
 * Check if a plan is a scan pack
 */
export function isScanPack(planType: PlanType): boolean {
  return planType === "scan_pack_10" || planType === "scan_pack_25";
}
