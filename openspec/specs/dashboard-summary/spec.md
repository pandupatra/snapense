## MODIFIED Requirements

### Requirement: Financial summary shows current month
The dashboard summary cards (total income, total expenses, balance) SHALL show data for the current calendar month only, instead of all-time totals. The chart remains showing rolling 30 days (unchanged).

#### Scenario: Dashboard displays current month summary
- **WHEN** an authenticated user views the dashboard
- **THEN** the summary cards show income, expenses, and balance for the current calendar month only

#### Scenario: Month transition
- **WHEN** the calendar month changes (e.g., from April to May)
- **THEN** the dashboard summary automatically resets to show the new month's data on next fetch

### Requirement: GetFinancialSummary accepts month and year parameters
The `getFinancialSummary` server action SHALL accept optional `month` and `year` parameters. When provided, it returns summary data for that specific month. When omitted, it returns all-time data (backward compatible).

#### Scenario: Called with current month and year
- **WHEN** `getFinancialSummary` is called with the current month and year
- **THEN** it returns total income, total expenses, and balance for that specific month

#### Scenario: Called without parameters
- **WHEN** `getFinancialSummary` is called without month/year parameters
- **THEN** it returns all-time total income, total expenses, and balance (same as current behavior)