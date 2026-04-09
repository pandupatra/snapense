# Tasks: Fix Critical Issues

## 1. Environment Variable Validation

- [x] Create `src/lib/config.ts` with `validateEnv()` function
- [x] Add all required env vars to `REQUIRED_ENV_VARS` constant
- [x] Implement `getConfig()` singleton function
- [x] Update `src/lib/auth.ts` to use `getConfig()` instead of direct `process.env` access
- [x] Import `getConfig()` in `src/app/layout.tsx` to trigger validation on app startup
- [ ] Test that app shows clear error when env vars are missing

## 2. Error Type System

- [x] Create `src/lib/errors.ts` with `ActionError` class
- [x] Add `isActionError()` type guard
- [x] Define error code types (`UNAUTHORIZED`, `VALIDATION`, `NOT_FOUND`, `INTERNAL`, `NETWORK`)

## 3. Update Server Actions Error Handling

- [x] Update `getBills()` to throw `ActionError` on failure
- [x] Update `createBill()` to throw `ActionError` on failure
- [x] Update `updateBill()` to throw `ActionError` on failure
- [x] Update `deleteBill()` to throw `ActionError` on failure
- [x] Update `searchBills()` to throw `ActionError` on failure
- [x] Update `getTotalExpenses()` to throw `ActionError` on failure
- [x] Update `importBillsFromCSV()` to throw `ActionError` on failure
- [x] Update `extractReceiptData()` to throw `ActionError` on failure

## 4. UI Error Display

- [x] Create `src/components/error-toast.tsx` component
- [x] Create `useActionErrors()` hook for error handling
- [x] Add error toast container to `src/app/layout.tsx`
- [x] Update `src/app/page.tsx` to use error handling in:
  - `handleSaveBill()`
  - `handleDeleteBill()`
  - `handleImportFileSelect()`
  - `fetchBills()`
  - `fetchMoreBills()`

## 5. Chart Date Sorting Fix

- [x] Update `generateChartData()` in `src/app/page.tsx` to use current year
- [x] Remove hardcoded "2024" from date sorting logic
- [ ] Test chart displays correctly for data in current year

## 6. Testing

- [ ] Test missing env var shows clear error message
- [ ] Test chart sorting with current year data
- [ ] Test error toasts display on:
  - Auth failures
  - Network errors
  - Invalid data
  - Database errors
- [ ] Test happy path still works (no regressions)
