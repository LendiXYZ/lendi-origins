# User Storage Fix - 500 Error on Authentication

## Problem Identified

### 500 Internal Server Error
After migrating session storage to Redis, authentication was still failing with:
```
POST /api/v1/auth/wallet/verify → 500 Internal Server Error
```

### Root Cause
The `VercelKvUserRepository` was trying to serialize/deserialize an `updatedAt` field that doesn't exist in the User model:

```typescript
// ❌ PROBLEM: User model doesn't have updatedAt
private serializeUser(user: User): string {
  return JSON.stringify({
    id: user.id,
    walletAddress: user.walletAddress,
    walletProvider: user.walletProvider,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(), // ❌ Doesn't exist!
  });
}
```

**User Model Structure:**
```typescript
export class User {
  readonly id: string;
  readonly walletAddress: string;
  readonly walletProvider: WalletProvider;
  readonly email?: string;
  readonly createdAt: Date;
  // ❌ NO updatedAt field!
}
```

## Solution Implemented

### Fixed VercelKvUserRepository
Removed all references to `updatedAt` field from serialization/deserialization logic.

**File:** `src/infrastructure/repository/vercel-kv/vercel-kv-user.repository.ts`

**Changes:**

1. **serializeUser()** - Removed updatedAt:
```typescript
private serializeUser(user: User): string {
  return JSON.stringify({
    id: user.id,
    walletAddress: user.walletAddress,
    walletProvider: user.walletProvider,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    // ✅ Removed: updatedAt
  });
}
```

2. **deserializeUser()** - Removed updatedAt:
```typescript
private deserializeUser(data: string): User {
  const parsed = JSON.parse(data);
  return new User({
    id: parsed.id,
    walletAddress: parsed.walletAddress,
    walletProvider: parsed.walletProvider,
    email: parsed.email || undefined,
    createdAt: new Date(parsed.createdAt),
    // ✅ Removed: updatedAt
  });
}
```

## Testing Results

### All Tests Pass
```bash
Test Files  22 passed (22)
     Tests  262 passed (262)
```

### Authentication Flow Works
```bash
✅ Nonce received
✅ Message signed
✅ Signature verified!
✅ Authentication successful
✅ Access token received
✅ Refresh token received
```

### Session Endpoints Work
```bash
✅ GET /api/v1/escrows → 200 OK
✅ GET /api/v1/workers → 200 OK
✅ POST /api/v1/auth/tokens/refresh → 200 OK
```

## Complete Fix Timeline

### Attempt 1 (Commit 12c74e6)
- Created VercelKvUserRepository with updatedAt field
- Result: 500 error on authentication

### Attempt 2 (Commit 2db2dd3)
- Fixed email handling: `email: parsed.email || undefined`
- Result: Still 500 error (updatedAt was the real issue)

### Attempt 3 (Commit 3d7b5f0) ✅ SUCCESS
- Removed updatedAt field from serialization
- Result: All tests pass, authentication works

## Production Status

### What Now Works
- ✅ User storage persists in Redis (no more loss between serverless instances)
- ✅ Authentication flow completes successfully
- ✅ Refresh tokens work correctly
- ✅ Authenticated endpoints return 200 OK
- ✅ Sessions persist for 30 days

### Complete Redis Storage
All critical auth data now in Redis:
- ✅ **Nonces** → `VercelKvNonceRepository` (5 min TTL)
- ✅ **Sessions** → `VercelKvSessionRepository` (30 day TTL)
- ✅ **Users** → `VercelKvUserRepository` (no expiration)

### Remaining Memory Repositories
These still use in-memory storage (OK for demo, need DB for production):
- ⚠️ `EscrowRepository` → MemoryEscrowRepository
- ⚠️ `LenderRepository` → MemoryLenderRepository
- ⚠️ `WorkerRepository` → MemoryWorkerRepository
- ⚠️ `LoanRepository` → MemoryLoanRepository
- ⚠️ `BusinessProfileRepository` → MemoryBusinessProfileRepository
- ⚠️ `ApiCredentialRepository` → MemoryApiCredentialRepository

**Note:** These repositories contain application data, not auth data. They can be migrated to Postgres/Neon later.

## Architecture

### Redis Keys Schema
```
# Auth storage (persistent across serverless instances)
nonce:{wallet}:{nonce}              → Nonce data (TTL: 5min)
session:{session_id}                → Session data (TTL: 30d)
refresh_token:{token}               → session_id (TTL: 30d)
user_sessions:{user_id}             → Set<session_id> (TTL: 30d+1h)
user:{user_id}                      → User data (no expiration)
wallet_index:{wallet}               → user_id (no expiration)
email_index:{email}                 → user_id (no expiration)
```

### Why This Works
1. **Shared state:** All serverless instances read from same Redis
2. **No data loss:** Users persist indefinitely
3. **Fast lookups:** O(1) access via wallet address or email
4. **Automatic cleanup:** Sessions expire after 30 days

## Deployment

### Commit
```bash
git commit -m "fix: Remove non-existent updatedAt field from User serialization"
```

### Deployed
- Commit: `3d7b5f0`
- Status: ✅ Deployed to production
- URL: https://lendi-origins.vercel.app

### Environment Variables
Uses existing Redis configuration:
```bash
KV_REDIS_URL=redis://default:***@redis-15563.c100.us-east-1-4.ec2.cloud.redislabs.com:15563
```

## Summary

The 500 error was caused by trying to access a non-existent `updatedAt` field on the User model. Removing all references to this field from the serialization logic fixed the issue.

**Previous attempts fixed:**
- Email handling (null safety)
- Redis connection pattern

**Final fix:**
- Removed updatedAt from serializeUser()
- Removed updatedAt from deserializeUser()

**Status:** ✅ **PRODUCTION READY**

All auth flows now work correctly:
1. Login with wallet signature
2. Access protected endpoints with JWT
3. Refresh tokens to extend session
4. User data persists across serverless instances
