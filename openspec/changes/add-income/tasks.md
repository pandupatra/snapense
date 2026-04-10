# Tasks: Add Income Feature

## Phase 1: Data Layer

- [ ] **T1: Add income schema to Drizzle**
  - File: `src/db/schema.ts`
  - Add `incomes` table with: id, userId, amount, currency, category, description, source, receivedAt, createdAt
  - Add `IncomeCategory` type: Salary, Freelance, Investment, Gift, Refund, Other
  - Add `IncomeInsert` and `IncomeSelect` types

- [ ] **T2: Generate and run migration**
  - Run `drizzle-kit generate` to create migration SQL
  - Run `drizzle-kit push` or `db:migrate` to apply

- [ ] **T3: Add income TypeScript types**
  - File: `src/types/bill.ts` (or new `src/types/transaction.ts`)
  - Add `Income`, `IncomeFormData`, `IncomeCategory` interfaces
  - Add `INCOME_CATEGORIES`, `INCOME_CATEGORY_NAMES_ID` constants
  - Add `Transaction` union type: `{ type: "expense"; bill: Bill } | { type: "income"; income: Income }`

## Phase 2: Server Actions

- [ ] **T4: Create income server actions**
  - File: `src/app/actions/incomes.ts`
  - `createIncome(data)` — INSERT
  - `updateIncome(id, data)` — UPDATE
  - `deleteIncome(id)` — DELETE
  - `getIncomes(cursor?, limit?)` — paginated SELECT

- [ ] **T5: Create unified dashboard server actions**
  - File: `src/app/actions/bills.ts` (modify) or new `src/app/actions/dashboard.ts`
  - `getRecentTransactions(cursor?, limit?)` — UNION across bills + incomes, sorted by date, tagged with type
  - `getFinancialSummary()` — aggregate income total, expense total, net balance for period
  - `getChartData()` — aggregate daily income vs expense for chart period

## Phase 3: UI Components

- [ ] **T6: Add Expense/Income toggle to BillEntryDialog**
  - File: `src/components/bill-entry-dialog.tsx`
  - Add two-tab toggle at top: [Expense] [Income]
  - Hide Photo/Upload buttons when Income selected
  - Swap merchant → source field, expense categories → income categories
  - Route to correct server action on submit
  - Support edit mode for both types

- [ ] **T7: Update dashboard summary cards**
  - File: `src/app/page.tsx`
  - Replace single "Total Expenses" card with 3 cards: Income, Expenses, Balance
  - Wire up to `getFinancialSummary()` action
  - Balance card: green if positive, red if negative

- [ ] **T8: Implement dual-area chart**
  - File: `src/app/page.tsx` (chart section)
  - Replace single area chart with recharts dual-area chart
  - Green area for income, red area for expenses
  - Same Y-axis scale, shared X-axis (dates)

- [ ] **T9: Implement unified timeline**
  - File: `src/app/page.tsx` (list section)
  - Mixed income + expense list sorted by date
  - Income entries: green amount (+Rp X), source field
  - Expense entries: red amount (-Rp X), merchant field (current)
  - Infinite scroll across both types
  - Search filters across both types

## Phase 4: Polish

- [ ] **T10: i18n for income categories**
  - Add Indonesian translations for income categories to i18n files
  - Ensure language switcher works for income-related UI strings

- [ ] **T11: Update CSV export**
  - Include income entries in CSV export
  - Add "Type" column (Income/Expense) to CSV output
