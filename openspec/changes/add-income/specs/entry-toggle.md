# Spec: Entry Dialog Toggle

## Capability

Allow users to switch between Expense and Income entry modes in the existing "+" entry dialog.

## Requirements

### Toggle Control

- Two-tab toggle at the top of the entry dialog: [Expense] [Income]
- Default selection: Expense (preserves current behavior)
- Toggle is visually prominent but minimal (consistent with monochrome design)
- Switching tabs clears/resets the form to avoid field conflicts

### Expense Mode (Current Behavior)

- Shows all existing fields: amount, currency, category (expense categories), description, merchant, date
- Photo mode and Upload buttons visible
- AI extraction available
- No changes to existing functionality

### Income Mode

- Fields: amount, currency, category (income categories), description, source, date
- Photo mode and Upload buttons **hidden**
- AI extraction **disabled** (manual entry only)
- "Merchant" label changes to "Source"
- Category dropdown shows income categories: Salary, Freelance, Investment, Gift, Refund, Other
- Source field: optional, text input
- Same amount, currency, description, and date fields as expense mode

### Form Submission

- Expense mode: calls existing `createBill()` server action
- Income mode: calls new `createIncome()` server action
- Both modes call `revalidatePath("/")` to refresh dashboard
- Success/error handling follows existing patterns
