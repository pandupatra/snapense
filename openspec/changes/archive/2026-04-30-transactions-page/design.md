## Context

Snapense is a Next.js App Router expense tracker using React Server Actions, Drizzle ORM with SQLite, and a single-page dashboard (`src/app/page.tsx`, ~1800 lines). Currently:

- `getFinancialSummary()` returns **all-time** totals (no date filtering)
- `getChartData()` returns **rolling 30 days** (hardcoded)
- `getRecentTransactions()` returns **all transactions** sorted by date (no date filter)
- The single dashboard page handles everything: summary, chart, CRUD, search, import/export

Users need a current-month dashboard and a separate transactions page with monthly filtering.

## Goals / Non-Goals

**Goals:**
- Dashboard summary cards show current calendar month only
- New `/transactions` page with all-time summary + monthly/yearly filtered transaction list
- Type filter (All/Income/Expense) and search on the transactions page
- Edit/delete works on both dashboard and transactions page
- Reuse existing UI patterns (dark/light mode, i18n, category icons)

**Non-Goals:**
- No new database tables or schema changes
- No changes to the chart on dashboard (stays rolling 30 days)
- No changes to dashboard transaction fetching (stays all-months infinite scroll)
- No refactoring of the 1800-line page.tsx (can be done separately later)
- No category-specific filter on transactions page (type + search + month/year is enough)

## Decisions

### 1. Route: `/transactions` (new Next.js page route)
**Choice:** `src/app/transactions/page.tsx`
**Rationale:** Uses Next.js App Router convention. Matches the user-facing name "Transactions". Clean URL.
**Alternative considered:** `/history` — shorter but less descriptive.

### 2. Server action pattern: new `src/app/actions/transactions.ts`
**Choice:** Create a new server action file with `getFilteredTransactions(page, limit, month, year, type, search)` and `getAllTimeSummary()`.
**Rationale:** Keeps the transactions page logic separate from dashboard logic. The dashboard doesn't need type filtering, so a separate action keeps concerns clean.
**Alternative considered:** Extending `dashboard.ts` — rejected because it would overload that file with parameters the dashboard doesn't use.

### 3. Dashboard `getFinancialSummary()` gets optional month/year params
**Choice:** Add optional `month` and `year` params defaulting to `undefined` (all-time behavior preserved). Dashboard passes current month/year.
**Rationale:** Minimal change to existing function signature. Backward compatible — if no params, returns all-time as before.

### 4. Month/year navigation UI
**Choice:** Simple prev/next arrows with month name + year dropdown, similar to Google Calendar's month picker.
**Rationale:** Familiar pattern, works well on mobile, no need for a full date picker.

### 5. Shared components — extract later
**Choice:** Do NOT extract shared components now. Duplicate the transaction list rendering in the new transactions page. Extract later in a refactor task.
**Rationale:** The current page.tsx is monolithic. Extracting shared components now would require refactoring the existing page, increasing risk. Better to duplicate and extract later.

### 6. Data fetching approach
**Choice:** Client-side fetching using server actions (same pattern as dashboard). Use `useEffect` and state hooks.
**Rationale:** Consistent with existing architecture. No need to introduce a different pattern.

## Risks / Trade-offs

- **Duplicate transaction list rendering:** Both pages render transactions similarly. Risk of divergence. Mitigation: extract to shared component in a follow-up.
- **Page.tsx size:** The dashboard page remains ~1800 lines. Not addressed in this change. Mitigation: tracked as future refactor.
- **Month boundary UX:** When filtering by month, users might expect to see running totals or comparisons. Not in scope. Mitigation: can add in future iteration.
- **Performance on transactions page:** Loading all-time summary + filtered transactions in parallel. The all-time summary is a simple SUM query — should be fast even with large datasets. SQLite handles this well.