## Context

The dashboard (`src/app/page.tsx`) currently renders all sections in a single vertical flow:
1. Summary cards (3-column grid, full width)
2. Dual-area chart (full width)
3. Recent Bills section (full width)

On desktop viewports (≥1024px), this creates a tall page where the recent transactions are far below the fold. The user wants the Recent Bills section visible alongside the summary and chart, using a 1/3 + 2/3 horizontal split.

## Goals / Non-Goals

**Goals:**
- Place Recent Bills in a left column (1/3 width) and Summary + Chart in a right column (2/3 width) on desktop
- Maintain existing vertical stacking on mobile and tablet (<1024px)
- Keep the Recent Bills list independently scrollable if it exceeds column height
- Preserve all existing visual styling, dark mode, and interactions

**Non-Goals:**
- Changing any data fetching logic, API endpoints, or database queries
- Modifying the content or behavior of any individual component (cards, chart, transaction list)
- Adding new animations beyond existing motion.div wrappers
- Changing the transactions page (`/transactions`)

## Decisions

**Decision: Use CSS Grid with `lg:grid-cols-3` for the main layout container**
- Rationale: CSS Grid provides precise fractional column control (1/3 + 2/3) and is the standard approach in this Tailwind-based codebase
- Alternative considered: Flexbox with percentage widths — rejected because Grid handles the gap and responsiveness more cleanly

**Decision: Keep Summary Cards + Chart grouped in a single column wrapper**
- Rationale: The summary cards and chart are already visually cohesive (both are overview widgets). Wrapping them in one column keeps their relative ordering intact and simplifies the grid structure
- Alternative considered: Splitting into 3 columns (summary, chart, bills) — rejected because it would compress the chart too much at 1/3 width

**Decision: No max-height or independent scrolling for the bills column**
- Rationale: Adding `overflow-y-auto` and `max-h-screen` can cause double scrollbars and accessibility issues. The existing infinite-scroll load-more pattern already manages content overflow gracefully
- Alternative considered: `sticky` positioning for the left column — rejected because it interferes with the natural page scroll and the load-more observer

**Decision: Maintain the existing `max-w-6xl` container on the parent**
- Rationale: The page already uses a centered container. The grid lives inside it, so the 1/3 + 2/3 split is relative to that consistent max width

## Risks / Trade-offs

- **[Risk]** The Recent Bills list could feel cramped at 1/3 width on 1024px–1280px viewports, especially with long merchant names
  - **Mitigation**: The transaction row already uses `truncate` and responsive text sizes. The 1/3 split only applies at `lg:` (≥1024px), which provides adequate width (~320px in a 1152px container)
- **[Risk]** Users with very few transactions may see an unbalanced layout with a short left column and tall right column
  - **Mitigation**: This is acceptable — the layout prioritizes information density, and visual imbalance is minor with the existing card styling
- **[Risk]** The chart's `ResponsiveContainer` may briefly miscalculate width during the layout shift
  - **Mitigation**: `ResponsiveContainer` handles container resize events automatically; no code changes needed
