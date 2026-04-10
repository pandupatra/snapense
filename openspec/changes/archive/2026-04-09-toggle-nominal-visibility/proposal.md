## Why

Users viewing their financial dashboard in public or shared spaces may want to hide monetary amounts (nominals) for privacy. An eye icon toggle allows quickly hiding/showing all nominal values across the dashboard — summary cards, chart tooltips, and transaction amounts — in a single click.

## What Changes

- Add an eye/eye-off toggle button (using lucide-react `Eye`/`EyeOff` icons) in the dashboard header
- When toggled to "hidden", replace all nominal values with masked placeholders (e.g., `••••••`) across:
  - Summary cards (total income, total expenses, balance)
  - Chart tooltips
  - Transaction table amount column
- Persist the visibility preference in component state (resets on page reload)

## Capabilities

### New Capabilities

- `nominal-visibility-toggle`: A toggle that hides/shows all monetary nominal values on the dashboard

### Modified Capabilities

## Impact

- **UI**: `src/app/page.tsx` — add eye icon button to header, mask nominal values conditionally
- **Dependencies**: `lucide-react` (already installed) for `Eye`/`EyeOff` icons
- **No API or database changes** — purely a frontend UI toggle
