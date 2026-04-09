# Subscription & Monetization System

## Summary

Implement a freemium subscription model with Mayar.id payment integration for the Indonesian market.

## Problem

Snapense is currently free with no monetization. To sustain operations and encourage development, we need to:
- Generate revenue from the app
- Cover AI API costs (Gemini)
- Provide incentive for users to upgrade

## Proposed Solution

### Pricing

| Plan | Price | Duration | Scans | Export |
|------|-------|----------|-------|--------|
| Free | Rp 0 | - | 5/week | ❌ |
| Premium Weekly | Rp 5,000 | 7 days | Unlimited | ✓ |
| Premium Monthly | Rp 15,000 | 30 days | Unlimited | ✓ |
| Scan Pack (10) | Rp 10,000 | One-time | 10 extra | - |
| Scan Pack (25) | Rp 20,000 | One-time | 25 extra | - |

### Free Tier Limitations
- 5 AI receipt scans per week (rolling 7-day window)
- No export features (CSV, Google Sheets)
- Basic charts only

### Premium Features
- Unlimited AI receipt scans
- Export to CSV & Google Sheets
- Advanced analytics & charts (future feature)
- Priority customer support

### Payment Gateway
- **Mayar.id** - Indonesian payment gateway
- Supported methods: QRIS, E-Wallet (GoPay, OVO, Dana, ShopeePay), Virtual Account, Bank Transfer
- Payment links via API
- Webhook callbacks for confirmation

## Scope

**Included:**
- User subscription tier system (free/premium)
- Scan counter with rolling 7-day window
- Mayar.id payment link generation
- Webhook handler for payment confirmations
- Subscription expiration & downgrade logic
- Upgrade prompts in UI
- Plan management page
- Export feature gating for premium users

**Excluded:**
- Advanced analytics feature (deferred to future change)
- Refund automation (manual process initially)
- Free trial period (unless for existing users at launch)

## Success Criteria

- [ ] Free users limited to 5 scans/week
- [ ] Scan counter displays remaining scans in UI
- [ ] Users can purchase weekly/monthly subscriptions via Mayar.id
- [ ] Users can purchase one-time scan packs
- [ ] Payments are confirmed via webhook and access is granted
- [ ] Subscriptions auto-renew until canceled
- [ ] Export features are gated for premium users
- [ ] Users can view and manage their subscription
- [ ] Expired subscriptions downgrade to free automatically

## Estimated Effort

- Database schema changes: 1 hour
- Scan limiting logic: 2-3 hours
- Mayar.id integration: 3-4 hours
- Webhook handler: 2 hours
- UI updates (counter, prompts, management): 4-5 hours
- Testing: 2-3 hours

**Total:** ~15-20 hours

## Dependencies

- Mayar.id API access (need to register account)
- Mayar.id API key for production
- Database migration for new tables/columns
