# Rate Limiting and Image Compression

## Summary

Add rate limiting to prevent API abuse and implement client-side image compression to reduce bandwidth and improve performance.

## Problem

**Rate Limiting:**
- No rate limiting on any endpoints
- Vulnerable to brute force attacks on auth
- AI receipt scanning (Gemini API) could be abused, costing money
- CSV import could be used for DoS

**Image Compression:**
- The `compressBase64Image()` function does nothing but log a warning
- Large images (5MB+) are sent to Gemini API unnecessarily
- Wastes bandwidth on both upload and API calls
- Comment in code says "use sharp or jimp" but never implemented

## Proposed Solution

### Part 1: In-Memory Rate Limiting

Implement a sliding-window rate limiter using in-memory storage:

- **Per-user rate limits** based on user ID
- **Sliding window algorithm** (not fixed bucket)
- **Different limits for different operations:**
  - Write operations (create, update, delete): 10 requests/minute
  - AI receipt scan: 30 requests/minute (still generous but prevents abuse)
  - CSV import: 5 requests/minute
  - Auth endpoints: 5 attempts/minute

### Part 2: Client-Side Image Compression

Replace the fake compression with real client-side compression:

- **Canvas-based compression** (browser built-in, no dependencies)
- **Resize to max 1024px** on the longest side
- **JPEG quality 0.7** (good balance of size/quality)
- **Target ~200KB** max file size
- **Process before sending** to server

## Scope

**Included:**
- Rate limiter implementation (in-memory, sliding window)
- Apply rate limiting to all server actions
- Apply rate limiting to API routes
- Client-side image compression utility
- Update bill entry dialog to compress images
- Remove fake `compressBase64Image()` function

**Excluded:**
- Redis/Upstash integration (overkill for this use case)
- Server-side image compression libraries (sharp/jimp)
- Persistent rate limit storage (resets on restart is acceptable)

## Success Criteria

- [ ] Rate limiting prevents >10 write requests/minute per user
- [ ] AI scan requests limited to 30/minute per user
- [ ] Images are compressed to ~200KB before sending to API
- [ ] Gemini API calls receive smaller images (faster, cheaper)
- [ ] No external dependencies added
- [ ] TypeScript compilation passes

## Estimated Effort

- Rate limiter implementation: 2-3 hours
- Apply to all endpoints: 1-2 hours
- Image compression utility: 1 hour
- Update UI to use compression: 1 hour
- Testing: 1-2 hours

**Total:** ~6-9 hours

## Dependencies

None. This is internal improvements with no external dependencies.
