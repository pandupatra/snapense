# Design: Income Feature

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Dashboard   │  │ Entry Dialog │  │ Unified       │  │
│  │ (unified)   │  │ (+ toggle)   │  │ Timeline      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
└─────────┼────────────────┼───────────────────┼──────────┘
          │                │                   │
┌─────────┼────────────────┼───────────────────┼──────────┐
│         ▼                ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Server Actions                      │   │
│  │  bills.ts (existing)    incomes.ts (new)         │   │
│  └────────────────┬──────────────────┬──────────────┘   │
│                   │                  │                   │
│                   ▼                  ▼                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SQLite + Drizzle ORM                │   │
│  │  bills table (existing)   incomes table (new)    │   │
│  └──────────────────────────────────────────────────┘   │
│                       Server                            │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### New `incomes` table

| Column      | Type    | Constraints                       |
| ----------- | ------- | --------------------------------- |
| id          | text    | PK                                |
| user_id     | text    | FK → user.id, ON DELETE CASCADE   |
| amount      | real    | NOT NULL                          |
| currency    | text    | NOT NULL, DEFAULT 'IDR'           |
| category    | text    | NOT NULL, ENUM (6 categories)     |
| description | text    | nullable                          |
| source      | text    | nullable (equivalent of merchant) |
| received_at | integer | NOT NULL, timestamp mode          |
| created_at  | integer | DEFAULT current timestamp         |

### Income Categories

```
Salary → Gaji
Freelance → Freelance
Investment → Investasi
Gift → Hadiah
Refund → Pengembalian
Other → Lainnya
```

## UI Design

### Entry Dialog Toggle

The existing `BillEntryDialog` component gets a toggle at the top:

```
┌─────────────────────────────────┐
│  [Expense]  [Income]      ← toggle tabs
│─────────────────────────────────│
│                                 │
│  (form fields change based on   │
│   selected type)                │
│                                 │
│  Expense: category, merchant    │
│  Income:  category, source      │
│                                 │
│  [Save]                         │
└─────────────────────────────────┘
```

When "Income" is selected:

- Category dropdown shows income categories
- "Merchant" field becomes "Source" field
- Photo/Upload buttons are hidden (manual only)
- AI extraction is disabled

### Dashboard Layout

```
┌─────────────────────────────────────────────┐
│  ┌────────┐  ┌──────────┐  ┌────────┐      │
│  │Income  │  │Expenses  │  │Balance │      │
│  │Rp 15M  │  │Rp 8.2M   │  │Rp 6.8M │      │
│  └────────┘  └──────────┘  └────────┘      │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ Dual-Area Chart                      │   │
│  │  ████ green area (income) ████       │   │
│  │  ████ red area (expenses) ████       │   │
│  │  (same x-axis: time)                 │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Recent Transactions                         │
│  ┌─ ● Salary from PT X        +Rp 15M      │
│  ├─ ● Groceries at Indomart   -Rp 250K     │
│  ├─ ● Freelance project       +Rp 3M       │
│  └─ ...                                      │
└─────────────────────────────────────────────┘
```

### Timeline Item Styling

| Property    | Expense             | Income                |
| ----------- | ------------------- | --------------------- |
| Amount text | Red (-Rp X)         | Green (+Rp X)         |
| Dot/icon    | Category icon (red) | Category icon (green) |
| Fields      | merchant, category  | source, category      |

## Server Actions

### New file: `src/app/actions/incomes.ts`

Mirrors the structure of existing `bills.ts`:

- `createIncome(data)` — INSERT into incomes
- `updateIncome(id, data)` — UPDATE incomes
- `deleteIncome(id)` — DELETE from incomes
- `getIncomes(cursor?, limit?)` — paginated SELECT

### Modified: `src/app/actions/bills.ts` (or new combined action)

- `getRecentTransactions(cursor?, limit?)` — UNION query across bills + incomes, sorted by date
- `getFinancialSummary()` — aggregate income total, expense total, net balance
- `getChartData()` — aggregate daily income vs expense for chart

## Data Flow

### Creating an Income Entry

```
User clicks "+"
  → BillEntryDialog opens
  → User toggles to "Income"
  → Photo/Upload buttons hide
  → Form shows: amount, currency, category (income), source, description, date
  → User fills and clicks Save
  → Server action: createIncome()
  → INSERT into incomes table
  → Dashboard refreshes (revalidatePath)
  → New entry appears in unified timeline (green)
```

### Loading the Unified Dashboard

```
Dashboard mounts
  → Fetch getFinancialSummary() → 3 summary cards
  → Fetch getChartData() → dual-area chart data
  → Fetch getRecentTransactions() → unified timeline
  → Each item tagged with type: "income" | "expense"
  → Render with color coding
```
