# Spec: Income CRUD

## Capability

Create, read, update, and delete income entries.

## Requirements

### Create Income

- User can add an income entry via the "+" button with the Income toggle selected
- Required fields: amount, currency, category, received_at date
- Optional fields: description, source
- Amount must be a positive number
- Default currency is IDR
- Default date is today
- Income entry is immediately visible in the unified timeline after save

### Read Income

- Income entries appear in the unified dashboard timeline, mixed with expenses
- Each income entry displays: category, source (if any), description (if any), amount (green, prefixed with +), currency, date
- Income entries are sorted by date (most recent first) alongside expenses
- Infinite scroll pagination works across both income and expense entries

### Update Income

- User can click an income entry in the timeline to edit it
- Edit dialog pre-fills all fields for the income entry
- Same form as create (Income mode)

### Delete Income

- User can delete an income entry from the timeline
- Confirmation dialog before deletion
- Dashboard summary and chart update immediately after deletion

## Validation

- Amount: required, positive number, max 999,999,999,999
- Currency: required, must be from supported currencies list
- Category: required, must be one of: Salary, Freelance, Investment, Gift, Refund, Other
- Source: optional, max 255 characters
- Description: optional, max 500 characters
- Date: required, cannot be in the future
