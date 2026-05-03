## ADDED Requirements

### Requirement: Transactions page route
The system SHALL provide a `/transactions` route that renders a dedicated transactions browsing page.

#### Scenario: Authenticated user navigates to transactions page
- **WHEN** an authenticated user navigates to `/transactions`
- **THEN** the system displays the transactions page with all-time summary, month/year filter, type filter, search, and filtered transaction list

#### Scenario: Unauthenticated user navigates to transactions page
- **WHEN** an unauthenticated user navigates to `/transactions`
- **THEN** the system redirects to the sign-in page (same behavior as dashboard)

### Requirement: All-time financial summary
The transactions page SHALL display an all-time financial summary (total income, total expenses, balance) that remains constant regardless of any active filters.

#### Scenario: User views all-time summary with no filter
- **WHEN** user opens the transactions page
- **THEN** the summary cards show all-time income, expenses, and balance totals

#### Scenario: User views all-time summary with month filter applied
- **WHEN** user selects a specific month/year filter
- **THEN** the all-time summary cards remain unchanged and continue to show all-time totals

### Requirement: Month/year navigation
The system SHALL provide a month/year selector that allows the user to navigate between months and years to filter the transaction list.

#### Scenario: Default month/year selection
- **WHEN** user opens the transactions page
- **THEN** the month/year selector defaults to the current month and year

#### Scenario: Navigate to previous month
- **WHEN** user clicks the previous arrow
- **THEN** the month decrements (wrapping from January to December of the previous year) and the transaction list updates

#### Scenario: Navigate to next month
- **WHEN** user clicks the next arrow
- **THEN** the month increments (wrapping from December to January of the next year) and the transaction list updates

#### Scenario: Select a different year
- **WHEN** user selects a year from the year dropdown
- **THEN** the transaction list updates to show transactions from the selected month and year

### Requirement: Type filter
The system SHALL provide a type filter with three options: All, Income, and Expense.

#### Scenario: Filter by All
- **WHEN** user selects "All"
- **THEN** the transaction list shows both income and expense transactions for the selected period

#### Scenario: Filter by Income
- **WHEN** user selects "Income"
- **THEN** the transaction list shows only income transactions for the selected period

#### Scenario: Filter by Expense
- **WHEN** user selects "Expense"
- **THEN** the transaction list shows only expense transactions for the selected period

### Requirement: Search within period
The system SHALL provide a search input that filters transactions by merchant, source, category, or description within the currently selected month/year and type filter.

#### Scenario: Search with active filters
- **WHEN** user types a search query with a specific month/year and type selected
- **THEN** the transaction list shows only transactions matching the search query AND the month/year AND type filter

#### Scenario: Clear search
- **WHEN** user clears the search input
- **THEN** the transaction list returns to showing all transactions matching the active month/year and type filter

### Requirement: Filtered transaction list with infinite scroll
The system SHALL display a paginated transaction list filtered by the selected month/year, type, and search query, with infinite scroll loading.

#### Scenario: Initial load
- **WHEN** user opens the transactions page
- **THEN** the system loads the first 20 transactions for the current month, type "All", with no search query

#### Scenario: Infinite scroll
- **WHEN** user scrolls to the bottom of the transaction list and more transactions exist
- **THEN** the system loads the next page of transactions and appends them to the list

#### Scenario: No transactions in selected period
- **WHEN** user selects a month/year with no transactions
- **THEN** the system displays an empty state message

### Requirement: Edit and delete transactions
The system SHALL allow users to edit and delete transactions from the transactions page, using the same dialog/form as the dashboard.

#### Scenario: Edit a transaction
- **WHEN** user clicks edit on a transaction
- **THEN** the bill entry dialog opens pre-filled with the transaction's data (expense or income form based on type)

#### Scenario: Delete a transaction
- **WHEN** user clicks delete on a transaction and confirms
- **THEN** the transaction is removed and the list and summary update accordingly

### Requirement: Filtered transactions server action
The system SHALL provide a `getFilteredTransactions` server action that accepts page, limit, month, year, type, and search parameters and returns paginated filtered transactions.

#### Scenario: Filter by month and year
- **WHEN** the action is called with month=4 and year=2025
- **THEN** it returns only transactions from April 2025

#### Scenario: Filter by type
- **WHEN** the action is called with type="income"
- **THEN** it returns only income transactions

#### Scenario: Combined filters
- **WHEN** the action is called with month=4, year=2025, type="expense", and search="coffee"
- **THEN** it returns expense transactions from April 2025 matching the search term "coffee"

#### Scenario: Pagination
- **WHEN** the action is called with page=2 and limit=20
- **THEN** it returns transactions 21-40 from the filtered results plus a hasMore flag