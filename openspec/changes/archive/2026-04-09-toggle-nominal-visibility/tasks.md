## 1. State & Imports

- [x] 1.1 Add `Eye` and `EyeOff` icon imports from `lucide-react` in `src/app/page.tsx`
- [x] 1.2 Add `isNominalHidden` state (`useState(false)`) to `HomeWrapper`

## 2. Toggle Button

- [x] 2.1 Add eye/eye-off toggle button in the header control bar (next to theme toggle) with proper dark/light mode styling

## 3. Mask Summary Cards

- [x] 3.1 Conditionally render `••••••` instead of `Rp{formatCurrency(...)}` in the income summary card when `isNominalHidden` is true
- [x] 3.2 Conditionally render `••••••` instead of `Rp{formatCurrency(...)}` in the expenses summary card when `isNominalHidden` is true
- [x] 3.3 Conditionally render `••••••` instead of `Rp{formatCurrency(...)}` in the balance summary card when `isNominalHidden` is true

## 4. Mask Chart Tooltip

- [x] 4.1 Update the Recharts `Tooltip` formatter to return `••••••` when `isNominalHidden` is true

## 5. Mask Transaction Amounts

- [x] 5.1 Conditionally render `••••••` instead of the formatted amount in each transaction row's amount column when `isNominalHidden` is true
