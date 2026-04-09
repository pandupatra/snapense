## Requirements

### Requirement: Eye toggle button in dashboard header

The system SHALL display an eye icon button in the dashboard header area (near theme toggle) that toggles between visible and hidden states using `Eye` (visible) and `EyeOff` (hidden) icons from lucide-react.

#### Scenario: Toggle button is visible on dashboard

- **WHEN** a user views the authenticated dashboard
- **THEN** the system displays an eye icon button in the header alongside the theme toggle and language switcher

#### Scenario: Toggle button shows Eye icon by default

- **WHEN** the dashboard loads
- **THEN** the toggle button displays the `Eye` icon, indicating nominals are visible

#### Scenario: Clicking toggle switches to EyeOff icon

- **WHEN** the user clicks the eye toggle button
- **THEN** the button icon changes to `EyeOff` and all nominals become hidden

### Requirement: Hide summary card nominals

The system SHALL replace the formatted currency values in the three summary cards (total income, total expenses, balance) with `••••••` when the toggle is in the hidden state.

#### Scenario: Nominals hidden in summary cards

- **WHEN** the user toggles nominals to hidden
- **THEN** the income card amount displays `••••••` instead of the currency value
- **AND** the expenses card amount displays `••••••` instead of the currency value
- **AND** the balance card amount displays `••••••` instead of the currency value

#### Scenario: Nominals shown in summary cards

- **WHEN** the user toggles nominals back to visible
- **THEN** all summary card amounts display the actual formatted currency values

### Requirement: Hide chart tooltip nominals

The system SHALL mask currency values in the Recharts tooltip when the toggle is in the hidden state.

#### Scenario: Chart tooltip shows masked values

- **WHEN** the user hovers over the chart area while nominals are hidden
- **THEN** the tooltip displays `••••••` instead of the formatted currency value

### Requirement: Hide transaction table amounts

The system SHALL replace the currency values in the transaction table amount column with `••••••` when the toggle is in the hidden state.

#### Scenario: Transaction amounts are hidden

- **WHEN** the user toggles nominals to hidden
- **THEN** each transaction row's amount column displays `••••••` instead of the formatted currency value

#### Scenario: Transaction amounts are shown

- **WHEN** the user toggles nominals back to visible
- **THEN** each transaction row's amount column displays the actual formatted currency value with the +/- prefix and currency symbol
