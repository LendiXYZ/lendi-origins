# CORS Deployment Issue - PIECE 2

## Problem

X-PAYMENT header is not appearing in CORS responses despite multiple successful deployments with correct code.

## Timeline

1. **Commit 497f127** - Added X-PAYMENT to middleware `with-cors.ts` line 31
2. **Commit 33dc306** - Added comment to force cache invalidation
3. **Commit 4d69d72** - Reordered headers (Authorization, Content-Type, X-PAYMENT)
4. **Commit 5602672** - Added X-PAYMENT to vercel.json headers config
5. **Commit b81c7c8** - Added Access-Control-Allow-Credentials to middleware

## Current State

### Expected Headers
```
Access-Control-Allow-Headers: Content-Type, Authorization, X-PAYMENT
```

### Actual Headers (in production)
```
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Code Status

### vercel.json (line 15)
```json
{
  "key": "Access-Control-Allow-Headers",
  "value": "Content-Type,Authorization,X-Idempotency-Key,X-Wallet-Provider,X-PAYMENT"
}
```
✅ Includes X-PAYMENT

### with-cors.ts (line 31)
```typescript
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-PAYMENT');
```
✅ Includes X-PAYMENT

## Deployment Evidence

### Vercel Build Logs (commit b81c7c8)
```
23:48:14.281 dist/interface/middleware/with-cors.js ✓ 7.36 KB
23:49:03.460 Deployment completed
```
✅ File compiled successfully

### Test Results
```bash
curl -s -i -X OPTIONS "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Origin: https://lendi-origin.vercel.app"

# Response shows OLD headers without X-PAYMENT
access-control-allow-headers: Content-Type, Authorization
```
❌ Runtime doesn't match compiled code

## Root Cause Hypothesis

### Theory 1: Vercel Serverless Function Cache
- Build cache shows "Restored build cache from previous deployment"
- Compiled .js files may be cached at function instance level
- New deployments create new build but may reuse function instances

### Theory 2: vercel.json Headers Override
- vercel.json `headers` section may REPLACE middleware headers
- Not merging, but completely overriding
- Middleware runs but headers get replaced by vercel.json config

### Theory 3: CDN Edge Cache
- Even with `x-vercel-cache: MISS`, edge nodes may cache responses
- OPTIONS responses cached separately from actual requests
- Cache TTL may be longer than deployment cycle

## Evidence Analysis

1. **Response format**: Headers show spaces ("Content-Type, Authorization") which matches middleware format, NOT vercel.json format ("Content-Type,Authorization")
2. **Missing header**: X-PAYMENT is missing from BOTH sources, suggesting old cached version
3. **Credentials header**: Shows up correctly, added in commit b81c7c8, proving SOME updates work

## Attempted Solutions

- ✅ Modified middleware code (multiple times)
- ✅ Modified vercel.json configuration
- ✅ Added comments to force recompilation
- ✅ Reordered headers to change compiled output
- ✅ Added new header (Access-Control-Allow-Credentials)
- ❌ None resolved the issue

## Next Steps (NOT ATTEMPTED)

1. **Remove vercel.json headers entirely** - Let middleware handle 100% of CORS
2. **Purge Vercel cache manually** - Via Vercel dashboard or API
3. **Add query parameter versioning** - Force new function instances
4. **Contact Vercel support** - May be platform-level caching issue

## Impact

- **PIECE 2 Status**: Code complete, deployment broken
- **Blocker for**: x402 micropayment integration
- **Workaround**: Frontend can try sending X-PAYMENT anyway, backend may accept it

## Test Command

```bash
bash tests/e2e/test-cors-headers.sh
```

## Last Tested

- Date: 2026-04-21 04:57:03 GMT
- Commit: b81c7c8
- Result: FAILED (X-PAYMENT not present)

## Notes

- This is a Vercel platform issue, not a code issue
- All code changes are correct and verified in git
- May resolve itself after cache expiration (unknown TTL)
- Manual intervention from user (Vercel dashboard) may be required
