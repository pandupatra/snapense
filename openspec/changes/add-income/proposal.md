# Proposal: Add Income Tracking

## Summary

Add income tracking to Snapense, transforming it from an expense-only tracker into a personal finance tracker with a unified view of income and expenses.

## Motivation

Snapense currently only tracks expenses (bills). Users need visibility into their income alongside expenses to understand their net financial position. This is a natural evolution of the product.

## Scope

### In Scope

- New `incomes` database table with separate data model
- 6 income categories: Salary, Freelance, Investment, Gift, Refund, Other
- Manual-entry only for income (no AI extraction)
- Expense/Income toggle on the existing "+" entry button
- Unified dashboard with 3 summary cards (Income, Expenses, Balance)
- Dual-area chart (income vs expenses over time)
- Unified timeline with color-coded entries (green for income, red for expense)
- Income CRUD (create, read, update, delete)
- Search/filter works across both income and expenses in unified timeline

### Out of Scope

- AI extraction for income (manual only)
- Recurring income templates
- Income-specific export (existing CSV export extended)
- Budgeting or savings goals
- Multi-currency conversion

## Key Decisions

- **Separate `incomes` table** instead of generalizing `bills` into `transactions` — avoids migration risk and keeps code clean
- **Same entry button with toggle** instead of separate entry flows — consistent UX, minimal UI change
- **Manual-only entry** — income receipts (pay stubs, transfer screenshots) are less standardized than purchase receipts, not worth AI complexity yet
- **Unified dashboard** instead of tabbed — users want to see their full financial picture at a glance
