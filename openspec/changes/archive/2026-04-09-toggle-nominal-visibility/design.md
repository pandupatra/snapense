## Context

The dashboard (`src/app/page.tsx`) displays monetary values in three locations:

1. **Summary cards** — total income, total expenses, balance (e.g., `Rp1.234.567`)
2. **Chart tooltip** — hover values on the area chart
3. **Transaction table** — per-row amounts in the amount column

All nominals use `formatCurrency()` or `formatCurrencyIDR()` helpers. There is currently no privacy mechanism for hiding these values. The component is a single large client component (`HomeWrapper`).

## Goals / Non-Goals

**Goals:**

- Add a single eye/eye-off toggle that hides all monetary nominals across the entire dashboard
- Mask values with a consistent placeholder (`••••••`)
- Keep the toggle accessible and visually consistent with existing UI patterns

**Non-Goals:**

- Persisting the preference across sessions (session-only state)
- Selective hiding (e.g., hide only some nominals)
- Affecting nominals inside dialogs (bill entry, import result, delete confirm)

## Decisions

### 1. State management: local `useState` boolean

- **Decision**: Use a simple `const [isNominalHidden, setIsNominalHidden] = useState(false)` in `HomeWrapper`.
- **Rationale**: This is session-only UI state that doesn't need to persist. No external store needed.
- **Alternative considered**: `localStorage` persistence — rejected as non-goal for this iteration.

### 2. Toggle button placement: header, next to theme toggle

- **Decision**: Place the eye icon button in the header row alongside the theme/language controls.
- **Rationale**: Consistent with where utility toggles already live. Visible and accessible.
- **Alternative considered**: Inside each summary card — rejected to avoid multiple toggles.

### 3. Masking approach: string replacement at render time

- **Decision**: Conditionally render `••••••` instead of the formatted currency string based on `isNominalHidden`.
- **Rationale**: Simple, no risk of leaking values. The actual numbers stay in state but are never rendered.
- **Alternative considered**: CSS blur/opacity — rejected as screen readers and devtools can still read values.

### 4. Chart tooltip handling

- **Decision**: Override the Recharts `Tooltip` formatter to return masked values when hidden.
- **Rationale**: The tooltip formatter already accepts a function, so masking is straightforward.

## Risks / Trade-offs

- **[Leakage via DOM]** → Values still exist in React state and could be inspected via devtools. Acceptable for a privacy toggle (not a security feature).
- **[Chart Y-axis]** → Y-axis is already hidden (`<YAxis hide />`), so no masking needed there.
