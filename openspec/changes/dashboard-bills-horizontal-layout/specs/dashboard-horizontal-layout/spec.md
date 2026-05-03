## ADDED Requirements

### Requirement: Desktop dashboard uses two-column layout
The dashboard SHALL render the Recent Bills section and the Summary + Chart section side-by-side in a two-column layout on desktop viewports (width ≥ 1024px), with Recent Bills occupying 1/3 of the width and Summary + Chart occupying 2/3 of the width.

#### Scenario: Desktop viewport displays horizontal layout
- **WHEN** an authenticated user views the dashboard on a viewport with width ≥ 1024px
- **THEN** the Recent Bills section appears in the left column (1/3 width)
- **AND** the Summary Cards and Chart appear in the right column (2/3 width)
- **AND** both columns are horizontally aligned at the top

### Requirement: Mobile and tablet maintain vertical stacking
The dashboard SHALL maintain the existing vertical stacking layout on viewports with width < 1024px, with no horizontal columns.

#### Scenario: Mobile viewport displays vertical layout
- **WHEN** an authenticated user views the dashboard on a viewport with width < 1024px
- **THEN** the Summary Cards, Chart, and Recent Bills stack vertically in that order
- **AND** no horizontal column layout is applied

### Requirement: Preserve existing component styling and behavior
All existing visual styling, dark mode theming, animations, interactions, and data fetching SHALL remain unchanged within the new layout structure.

#### Scenario: Dark mode in horizontal layout
- **WHEN** the user has dark mode enabled
- **THEN** the two-column layout applies the same dark mode colors and borders as the current vertical layout

#### Scenario: Transaction interactions in horizontal layout
- **WHEN** the user clicks a transaction row, search, add bill, or perform any existing interaction
- **THEN** the behavior is identical to the current vertical layout
