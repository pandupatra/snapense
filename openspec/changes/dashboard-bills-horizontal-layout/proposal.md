## Why

The dashboard currently stacks all sections vertically (summary cards → chart → recent bills), resulting in excessive vertical scrolling and poor use of horizontal screen real estate on desktop. By placing the recent bills section side-by-side with the summary and chart, users can see their financial overview and recent transactions simultaneously, improving information density and usability.

## What Changes

- Restructure the dashboard layout so the **Recent Bills** section sits horizontally beside the **Summary Cards + Chart** section
- Use a responsive grid: **1/3 width for Recent Bills** and **2/3 width for Summary + Chart** on desktop (≥1024px)
- On tablet and mobile, maintain the existing vertical stacking behavior
- Ensure the Recent Bills list remains scrollable independently within its column if content exceeds viewport height
- Preserve all existing styling, dark mode support, and interactions

## Capabilities

### New Capabilities
- `dashboard-horizontal-layout`: Responsive two-column dashboard layout with 1/3–2/3 split for desktop viewports

### Modified Capabilities
- (none — this is purely a UI layout change with no spec-level behavior changes)

## Impact

- `src/app/page.tsx`: Dashboard layout structure (grid/flex container changes)
- Tailwind responsive classes: `lg:grid-cols-3`, `lg:col-span-2`, `lg:col-span-1`
- No API, database, or authentication changes
