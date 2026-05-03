## Why

The dashboard currently shows all-time financial totals and all transactions in one page with no date filtering. Users need a focused current-month view on the dashboard, and a dedicated page to browse and filter transactions by month/year — a core expectation for any finance tracker.

## What Changes

- Dashboard summary cards will show **current month** income/expenses/balance instead of all-time totals
- Dashboard chart stays as rolling 30 days (unchanged behavior)
- Dashboard transaction list continues to show all months with infinite scroll (unchanged behavior)
- New **Transactions page** (`/transactions`) with:
  - All-time summary cards (always visible, unaffected by filters)
  - Month/year navigator with prev/next arrows and year dropdown
  - Type filter (All / Income / Expense)
  - Search within the selected period
  - Filtered transaction list with infinite scroll
  - Edit/delete functionality (same as dashboard)
- New server action `getFilteredTransactions()` supporting month, year, type, and search filters
- `getFinancialSummary()` gains optional `month`/`year` params for current-month filtering on dashboard

## Capabilities

### New Capabilities
- `transactions-page`: Dedicated page for browsing all transactions with monthly/yearly filters, type filters, search, and all-time summary

### Modified Capabilities
- `dashboard-summary`: Summary cards on dashboard now show current-month data instead of all-time totals; `getFinancialSummary()` gains optional month/year params

## Impact

- **`src/app/page.tsx`**: Modified to pass current month/year to `getFinancialSummary()`
- **`src/app/actions/dashboard.ts`**: `getFinancialSummary()` gains month/year optional params
- **`src/app/transactions/page.tsx`**: New page component
- **`src/app/actions/transactions.ts`**: New server action for filtered transaction queries
- **`src/components/`**: Shared transaction list item component extracted for reuse between dashboard and transactions page
- **`src/lib/i18n.ts`**: New translation keys for transactions page labels