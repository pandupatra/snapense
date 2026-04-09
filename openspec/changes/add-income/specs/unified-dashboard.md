# Spec: Unified Dashboard

## Capability

Display income and expenses in a single unified view with summary metrics and visualizations.

## Requirements

### Summary Cards

- Three cards displayed at the top of the dashboard:
  1. **Income**: Sum of all income for the current period (default: current month)
  2. **Expenses**: Sum of all expenses for the current period
  3. **Balance**: Income minus Expenses (net). Displayed in green if positive, red if negative
- Each card shows the currency symbol and formatted amount
- Cards update immediately when entries are added/edited/deleted

### Dual-Area Chart

- Replaces the current single area chart
- Two overlapping area series on the same chart:
  - Income area: green fill
  - Expenses area: red fill
- X-axis: dates (same range as current chart)
- Y-axis: amount in selected currency
- Both areas use the same Y-axis scale for visual comparison
- Shows data for the current month by default
- Uses existing recharts library

### Unified Timeline

- Mixed list of income and expense entries, sorted by date (most recent first)
- Each entry displays:
  - Type indicator (color-coded dot or icon)
  - Category name
  - Source (income) or Merchant (expense)
  - Amount with sign prefix: +Rp X for income, -Rp X for expense
  - Date
- Income entries: green amount text, green accent
- Expense entries: red amount text, red accent (current behavior)
- Infinite scroll pagination across both types
- Search filters across both income and expense entries
- Click to edit, swipe/menu to delete (same as current expense behavior)

### Period Filtering

- Current month is the default period
- Same filtering pattern as current dashboard
