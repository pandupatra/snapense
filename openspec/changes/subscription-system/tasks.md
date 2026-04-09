# Tasks: Subscription & Monetization System

## 1. Database Schema Changes

- [x] Add `subscriptionTier`, `premiumExpiresAt`, `scanResetDay` columns to users table
- [x] Create `scan_usage` table with indexes
- [x] Create `subscription` table with indexes
- [x] Generate and run database migration
- [x] Update Drizzle schema types

## 2. Scan Limiting Logic

- [x] Create `src/lib/scan-limit.ts` with week calculation utilities
- [x] Implement `getCurrentWeekInfo()` function
- [x] Implement `getUserScanLimit()` function
- [x] Implement `recordScan()` function
- [x] Add week calculation helpers (getWeekStart, getWeekEnd)

## 3. Pricing Configuration

- [x] Create `src/lib/pricing.ts` with price constants
- [x] Define pricing for weekly, monthly, scan packs
- [x] Add helper functions to get plan details

## 4. Mayar.id Integration

- [x] Create `src/lib/mayar.ts` with API client
- [x] Implement signature verification function
- [x] Add Mayar API types and interfaces
- [x] Get MAYAR_API_KEY from environment config

## 5. Payment Actions

- [x] Create `src/app/actions/payment.ts`
- [x] Implement `createPayment()` action
- [x] Add external ID generation for payments
- [x] Implement expiration calculation
- [x] Handle scan pack purchases separately

## 6. Webhook Handler

- [x] Create `src/app/api/mayar/webhook/route.ts`
- [x] Implement signature verification
- [x] Handle 'paid' status event
- [x] Update subscription status to 'active'
- [x] Upgrade user to premium tier
- [x] Add logging for troubleshooting

## 7. Subscription Management

- [x] Create `src/app/actions/subscription.ts`
- [x] Implement `getUserSubscription()` query
- [x] Implement `cancelSubscription()` action
- [x] Implement `checkPremiumAccess()` helper
- [x] Add subscription status checking

## 8. UI - Scan Counter

- [x] Create `src/components/scan-counter.tsx`
- [x] Display remaining scans for free users
- [x] Display premium badge for premium users
- [x] Show "Low!" warning when 1 scan remaining
- [x] Add query hook for scan data

## 9. UI - Upgrade Prompts

- [x] Create `src/components/upgrade-prompt.tsx`
- [x] Create `src/components/pricing-cards.tsx`
- [x] Show upgrade dialog when limit reached
- [x] Display weekly/monthly/scan pack options
- [x] Add QR code display for Mayar payment

## 10. UI - Plan Management Page

- [x] Create `src/app/account/page.tsx` (new route)
- [x] Show current subscription status
- [x] Show scan history/usage
- [x] Display active subscriptions
- [x] Add cancel subscription button
- [ ] Show payment history

## 11. Update Main Page

- [x] Add ScanCounter component to header
- [x] Add upgrade prompt when scans exhausted
- [x] Show premium badge for premium users

## 12. Update Bills Actions

- [x] Modify `extractReceiptData()` to check scan limit
- [x] Add `recordScan()` call after successful scan
- [x] Handle scan limit exceeded error
- [x] Show appropriate error message

## 13. Export Gating

- [x] Create `src/lib/require-premium.ts` helper
- [x] Update CSV export to check premium status
- [x] Update Google Sheets export to check premium status
- [x] Add upgrade prompt for export attempts by free users

## 14. Environment Configuration

- [x] Add MAYAR_API_KEY to environment config validation
- [x] Add MAYAR_SECRET_KEY for webhook signature verification
- [x] Update `.env.example` with new variables

## 15. Testing

- [ ] Test scan limit enforced at 5 per week
- [ ] Test scan counter resets after 7 days
- [ ] Test upgrade prompt shows at limit
- [ ] Test payment link generation
- [ ] Test webhook processes payment correctly
- [ ] Test user upgraded to premium after payment
- [ ] Test premium user can export
- [ ] Test free user cannot export
- [ ] Test subscription expiration downgrades user
- [ ] Test scan packs add to quota
- [ ] Test Mayar.id signature verification
