# Tasks: Rate Limiting and Image Compression

## 1. Rate Limiter Implementation

- [x] Create `src/lib/rate-limit.ts` with sliding window algorithm
- [x] Implement `RateLimiter` class with `checkLimit()` method
- [x] Define rate limit configs for different action types
- [x] Add cleanup method to prevent memory leaks
- [x] Export rate limiter instances for each action type

## 2. Error Handling

- [x] Add `RateLimitError` class to `src/lib/errors.ts`
- [x] Include `resetAt` timestamp in error
- [x] Update error toast to show retry time for rate limit errors

## 3. Apply Rate Limiting to Server Actions

- [x] Add rate check to `createBill()`
- [x] Add rate check to `updateBill()`
- [x] Add rate check to `deleteBill()`
- [x] Add rate check to `extractReceiptData()` (use aiScan limit)
- [x] Add rate check to `importBillsFromCSV()` (use csvImport limit)

## 4. Apply Rate Limiting to API Routes

- [ ] Add rate limiting to `/api/auth/[...all]/route.ts` (skipped - better-auth passthrough)
- [x] Add rate limiting to `/api/export/sheets/route.ts`
- [x] Add rate limiting to `/api/auth/verify-email/route.ts`

## 5. Image Compression Utility

- [x] Create `src/lib/image-compressor.ts`
- [x] Implement `compressImage()` function with canvas
- [x] Add dimension calculation (max 1024px)
- [x] Add iterative quality reduction to hit size target
- [x] Export `CompressOptions` interface

## 6. Update UI for Image Compression

- [x] Import `compressImage` in `bill-entry-dialog.tsx`
- [x] Add compression step before calling `extractReceiptData()`
- [x] Add compression step before `handleFileSelect()` upload (already in flow via useEffect)
- [x] Log size reduction for debugging
- [x] Handle compression errors gracefully

## 7. Cleanup

- [x] Remove unused `compressBase64Image()` from `bills.ts`
- [x] Remove `extractResponseText()` helper if no longer needed (still used, kept)
- [x] Remove unused imports (none to remove)

## 8. Testing

- [ ] Test rate limit enforced after 10 write requests
- [ ] Test rate limit enforced after 30 AI scan requests
- [ ] Test rate limit error shows retry time
- [ ] Test rate limit resets after window expires
- [ ] Test image compression reduces file size
- [ ] Test compressed image still works with Gemini API
- [ ] Test compression doesn't affect quality noticeably
- [ ] Test small images aren't blown up
- [ ] Test happy path still works (no regressions)
