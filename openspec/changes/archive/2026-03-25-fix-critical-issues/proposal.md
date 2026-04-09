# Fix Critical Issues in Snapense

## Summary

Fix critical bugs and security issues identified during codebase review:
- Hardcoded 2024 breaking chart functionality
- Silent error handling masking failures
- Unsafe environment variable type casting

## Problem

The codebase has three high-severity issues that could cause immediate problems:

1. **Chart Sorting Bug**: Date sorting hardcodes "2024", causing incorrect chart display starting 2025
2. **Silent Failures**: All server actions swallow errors, returning empty/null results - users cannot distinguish between "no data" and "system error"
3. **Unsafe Env Vars**: Google OAuth credentials are cast without validation, risking runtime crashes

## Proposed Solution

### Phase 1: High Severity (This Change)
1. Fix chart date sorting to use current year context
2. Implement proper error types and propagate errors to UI
3. Add environment variable validation at startup

### Phase 2: Medium Severity (Future)
- Remove OAuth token from URL (use secure storage)
- Add rate limiting to API routes
- Fix search wildcard injection

### Phase 3: Lower Severity (Future)
- Multi-currency math fixes
- Input validation consistency
- Code deduplication

## Scope

**Included:**
- Fix `generateChartData()` date sorting in `page.tsx`
- Create error types and update error handling in server actions
- Add env var validation helper and startup check
- Update UI to display error messages appropriately

**Excluded:**
- Medium/low severity issues (deferred to future changes)
- New features
- Refactoring beyond what's necessary for fixes

## Success Criteria

- [ ] Chart displays dates correctly regardless of year
- [ ] Server actions return structured errors instead of silent failures
- [ ] Application fails fast with clear error if env vars missing
- [ ] UI shows user-friendly error messages when operations fail

## Estimated Effort

- **Chart fix**: 30 minutes
- **Error handling**: 2-3 hours
- **Env validation**: 1 hour
- **Testing**: 1-2 hours

**Total**: ~5-7 hours

## Dependencies

None. This is purely internal bug fixing.
