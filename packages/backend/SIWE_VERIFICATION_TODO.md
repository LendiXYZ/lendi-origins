# SIWE Verification - Pending Changes for Production

**Current Status:** Simplified nonce-based verification (testnet only)
**Date:** April 18, 2026
**Priority:** Before mainnet deployment

---

## Current Implementation (Testnet)

### What's Implemented Now

```typescript
// packages/backend/src/infrastructure/auth/siwe-verifier.ts
export class SiweVerifier {
  async verify(message: string, _signature: string) {
    // Parses SIWE message
    // Validates nonce exists and hasn't been used (NonceService)
    // Returns valid: true if nonce is correct
    // Does NOT verify cryptographic signature
  }
}
```

### Why This Works for Testnet

1. **Nonce Security:**
   - Backend generates one-time nonce per wallet address
   - Nonce is validated and marked as used (prevents replay attacks)
   - Nonce expires after a short time window

2. **ZeroDev Smart Accounts Issue:**
   - ZeroDev produces ERC-6492 signatures (smart accounts)
   - ERC-6492 requires on-chain `eth_call` to verify
   - Testnet RPCs (Arbitrum Sepolia) are unreliable for this
   - Would cause authentication failures in production

3. **Acceptable Risk for Testnet:**
   - No real funds at stake
   - Nonce validation prevents most attack vectors
   - Focus on UX and testing core flows

---

## Required Changes Before Mainnet

### Priority 1: Full Signature Verification

**What needs to be done:**

1. **Add ERC-1271 Verification**
   ```typescript
   import { createPublicClient, http } from 'viem';
   import { arbitrum } from 'viem/chains'; // mainnet chain

   export class SiweVerifier {
     async verify(message: string, signature: string) {
       const siweMessage = new SiweMessage(message);
       const address = siweMessage.address as `0x${string}`;

       // Use reliable mainnet RPC
       const publicClient = createPublicClient({
         chain: arbitrum,
         transport: http(process.env.MAINNET_RPC_URL, {
           timeout: 10_000
         }),
       });

       // Verify signature (supports both EOA and ERC-1271)
       const valid = await publicClient.verifyMessage({
         address,
         message,
         signature: signature as `0x${string}`,
       });

       if (!valid) {
         logger.warn({ address }, 'Invalid SIWE signature');
         return { address: '', valid: false };
       }

       return { address: siweMessage.address, valid: true };
     }
   }
   ```

2. **Use Reliable Mainnet RPC**

   **Recommended RPCs for Mainnet:**
   - **Alchemy:** `https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
   - **Infura:** `https://arbitrum-mainnet.infura.io/v3/YOUR_API_KEY`
   - **QuickNode:** `https://YOUR_ENDPOINT.arbitrum-mainnet.quiknode.pro/YOUR_TOKEN/`

   **Configure in Vercel:**
   ```bash
   MAINNET_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

3. **Add Fallback RPC (Optional but Recommended)**
   ```typescript
   const FALLBACK_RPCS = [
     process.env.MAINNET_RPC_URL,
     'https://arb1.arbitrum.io/rpc', // Public Arbitrum RPC
   ];

   for (const rpcUrl of FALLBACK_RPCS) {
     try {
       const client = createPublicClient({ /* ... */ });
       const valid = await client.verifyMessage({ /* ... */ });
       return { address: siweMessage.address, valid };
     } catch (err) {
       logger.warn({ rpcUrl, error: err }, 'RPC failed, trying next');
       continue;
     }
   }
   ```

---

## Priority 2: Security Enhancements

### 1. Add Signature Expiration Check

```typescript
async verify(message: string, signature: string) {
  const siweMessage = new SiweMessage(message);

  // Check if message is expired
  if (siweMessage.expirationTime &&
      new Date(siweMessage.expirationTime) < new Date()) {
    logger.warn({ address: siweMessage.address }, 'SIWE message expired');
    return { address: '', valid: false };
  }

  // Check if message is not yet valid
  if (siweMessage.notBefore &&
      new Date(siweMessage.notBefore) > new Date()) {
    logger.warn({ address: siweMessage.address }, 'SIWE message not yet valid');
    return { address: '', valid: false };
  }

  // ... continue with signature verification
}
```

### 2. Validate Chain ID

```typescript
async verify(message: string, signature: string) {
  const siweMessage = new SiweMessage(message);

  // Ensure message is for correct chain
  const expectedChainId = process.env.CHAIN_ID; // 42161 for Arbitrum mainnet
  if (siweMessage.chainId !== parseInt(expectedChainId)) {
    logger.warn({
      address: siweMessage.address,
      messageChainId: siweMessage.chainId,
      expectedChainId
    }, 'Chain ID mismatch');
    return { address: '', valid: false };
  }

  // ... continue with signature verification
}
```

### 3. Validate Domain and URI

```typescript
async verify(message: string, signature: string) {
  const siweMessage = new SiweMessage(message);

  // Validate domain matches your frontend
  const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];
  if (!allowedDomains.includes(siweMessage.domain)) {
    logger.warn({
      address: siweMessage.address,
      domain: siweMessage.domain
    }, 'Domain not allowed');
    return { address: '', valid: false };
  }

  // ... continue with signature verification
}
```

---

## Priority 3: Rate Limiting

### Add Rate Limiting for Auth Endpoints

```typescript
// Use existing rate limiter or add new one
import { RateLimiterMemory } from 'rate-limiter-flexible';

const authRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60, // per 60 seconds
  blockDuration: 300, // block for 5 minutes if exceeded
});

// In auth controller
async verifyWallet(req, res) {
  const ip = req.ip || req.connection.remoteAddress;

  try {
    await authRateLimiter.consume(ip);
  } catch (rateLimitError) {
    logger.warn({ ip }, 'Auth rate limit exceeded');
    return res.status(429).json({
      error: 'Too many authentication attempts'
    });
  }

  // ... continue with verification
}
```

---

## Testing Before Mainnet

### 1. Test with Real Smart Accounts

```bash
# Test with ZeroDev smart account on mainnet fork
npm run test:integration -- --testPathPattern=auth
```

### 2. Test Signature Verification

```typescript
// test/integration/auth.test.ts
describe('SIWE Verification (Mainnet)', () => {
  it('should verify EOA signature', async () => {
    // Test with regular wallet
  });

  it('should verify ERC-1271 smart account signature', async () => {
    // Test with ZeroDev account
  });

  it('should reject expired signatures', async () => {
    // Test expiration
  });

  it('should reject wrong chain ID', async () => {
    // Test chain validation
  });
});
```

### 3. Load Testing

```bash
# Test RPC reliability under load
npm run test:load -- auth
```

---

## Environment Variables Changes

### Current (Testnet)

```bash
# Testnet - simplified verification
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
CHAIN_ID=421614
```

### Required for Mainnet

```bash
# Mainnet - full verification
MAINNET_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
FALLBACK_RPC_URL=https://arb1.arbitrum.io/rpc
CHAIN_ID=42161
ALLOWED_DOMAINS=lendi.xyz,app.lendi.xyz
```

---

## Security Audit Checklist

Before deploying to mainnet, ensure:

- [ ] Full signature verification implemented (ERC-1271 support)
- [ ] Reliable mainnet RPC configured (Alchemy/Infura/QuickNode)
- [ ] Fallback RPC implemented and tested
- [ ] Signature expiration check added
- [ ] Chain ID validation added
- [ ] Domain validation added
- [ ] Rate limiting implemented
- [ ] Integration tests passing with real smart accounts
- [ ] Load testing completed
- [ ] Security audit performed by third party
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

---

## Estimated Implementation Time

- **Priority 1 (Signature Verification):** 2-3 hours
- **Priority 2 (Security Enhancements):** 2-4 hours
- **Priority 3 (Rate Limiting):** 1-2 hours
- **Testing:** 4-6 hours
- **Total:** ~1-2 days

---

## References

- **SIWE Specification:** https://eips.ethereum.org/EIPS/eip-4361
- **ERC-1271:** https://eips.ethereum.org/EIPS/eip-1271
- **ERC-6492:** https://eips.ethereum.org/EIPS/eip-6492
- **Viem verifyMessage:** https://viem.sh/docs/actions/public/verifyMessage.html
- **ZeroDev Docs:** https://docs.zerodev.app/

---

## Notes

**Current implementation is SAFE for testnet because:**
1. Nonce prevents replay attacks
2. No real funds at risk
3. Focus on UX testing

**MUST be updated before mainnet because:**
1. Real funds will be at stake
2. Signature verification is security best practice
3. Required for security audits
4. Protects against various attack vectors

**When to implement:** Before mainnet deployment or when handling real value/sensitive data.
