## 1. Server Actions

- [x] 1.1 Add `month` and `year` optional params to `getFinancialSummary()` in `src/app/actions/dashboard.ts` — filter bills/incomes SUM queries by month/year when provided, default to all-time when omitted
- [x] 1.2 Create `src/app/actions/transactions.ts` with `getFilteredTransactions(page, limit, month, year, type, search)` server action — query bills and incomes with month/year/date range filter, type filter (all/income/expense), and search filter, return paginated results with `hasMore` flag
- [x] 1.3 Add `getAllTimeSummary()` server action to `src/app/actions/transactions.ts` — returns all-time income, expenses, balance (same as current `getFinancialSummary()` with no params)

## 2. Dashboard Update

- [x] 2.1 Update `src/app/page.tsx` to pass current month and year to `getFinancialSummary()` — compute current month/year, call `getFinancialSummary(currentMonth, currentYear)`, display the month label (e.g. "April 2025") near the summary cards
- [x] 2.2 Add a "View all transactions" link/button at the bottom of the recent transactions section on the dashboard that navigates to `/transactions`

## 3. Transactions Page — Route & Layout

- [x] 3.1 Create `src/app/transactions/page.tsx` with basic layout — auth check, theme support, i18n support, same header pattern as dashboard
- [x] 3.2 Add navigation link from dashboard header to transactions page (e.g. a "Transactions" nav item or icon)

## 4. Transactions Page — All-Time Summary

- [x] 4.1 Add all-time summary cards section at top of transactions page — call `getAllTimeSummary()`, render Income/Expenses/Balance cards matching dashboard card style, always show all-time data regardless of filters
- [x] 4.2 Add nominal visibility toggle (eye icon) to all-time summary cards on transactions page (same as dashboard)

## 5. Transactions Page — Filters

- [x] 5.1 Implement month/year navigator UI — prev/next arrows, month name display, year dropdown (current year ± 5 years), default to current month/year on page load
- [x] 5.2 Implement type filter tabs/buttons — All, Income, Expense — default to "All"
- [x] 5.3 Implement search input — debounced 300ms, clears on filter change, same style as dashboard search
- [x] 5.4 Wire filter state to server action calls — when month/year/type/search changes, call `getFilteredTransactions()` with the new params and update the transaction list

## 6. Transactions Page — Transaction List

- [x] 6.1 Implement filtered transaction list rendering — display transactions matching the active filters, using same card/row style as dashboard
- [x] 6.2 Implement infinite scroll for filtered transaction list — intersection observer pattern, load 20 per page, append on scroll
- [x] 6.3 Implement edit transaction — open BillEntryDialog in edit mode, refresh list on save
- [x] 6.4 Implement delete transaction — confirmation dialog, refresh list and summary on delete
- [x] 6.5 Implement empty state — show message when no transactions match the current filters

## 7. i18n

- [x] 7.1 Add translation keys for transactions page labels to `src/lib/i18n.ts` — month names (if not present), type filter labels, search placeholder, empty state text, "View all transactions" link text