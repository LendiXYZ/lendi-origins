# Local Testing Guide — Lendi Backend

## Paso 6: Testing Local

### Prerequisites
- Node.js 20+
- pnpm 10.30.3+
- Wallet with testnet ETH on Arbitrum Sepolia
- Access to deployed contracts

---

## Setup

### 1. Create Local Environment File

```bash
cd /mnt/c/Users/CarlosIsraelJiménezJ/Documents/Fhenix/Buildathon-Fhenix/lendi/packages/backend
cp .env.example .env
```

### 2. Fill Required Variables

Edit `.env` with your values:

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Copy to .env
JWT_SECRET=<generated_secret>

# Your backend signer private key (will be registered as lender)
SIGNER_PRIVATE_KEY=0x...

# Optional: Database (defaults to memory storage)
DATABASE_URL=postgresql://...
DB_PROVIDER=postgres  # or leave as 'memory' for local testing

# QuickNode webhook secret (get from QuickNode dashboard after creating stream)
QUICKNODE_WEBHOOK_SECRET=<from_quicknode>
```

**Already configured in .env.example:**
- ✅ Lendi contract addresses (Wave 2 deployed)
- ✅ ReinieraOS contract addresses
- ✅ RPC URL (Arbitrum Sepolia)
- ✅ USDC address

---

## Run Development Server

```bash
pnpm dev
```

Server will start on `http://localhost:3000`

---

## Testing Endpoints

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected: `200 OK`

### 2. Request SIWE Nonce

```bash
curl -X POST http://localhost:3000/api/v1/auth/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0xYourWalletAddress"}'
```

Expected:
```json
{
  "nonce": "4b45a5d81b32c2e083c5e195ed68dc881d6ace97573921707b05c606edb6eeb7"
}
```

### 3. Verify Wallet (requires signing message)

```bash
# First sign the message with your wallet
# Then send:
curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0xYourWalletAddress",
    "signature": "0x...",
    "message": "..."
  }'
```

Expected:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600
}
```

### 4. Create Worker (requires auth)

```bash
curl -X POST http://localhost:3000/api/v1/workers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "wallet_address": "0xYourWalletAddress"
  }'
```

### 5. Create Loan (requires auth + worker registered on-chain)

```bash
curl -X POST http://localhost:3000/api/v1/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "worker_id": "worker_uuid",
    "lender_id": "lender_uuid",
    "worker_address": "0xWorkerAddress",
    "beneficiary": "0xBeneficiaryAddress",
    "loan_amount_usdc": 1000,
    "threshold_usdc": 500
  }'
```

Expected (if worker is registered):
```json
{
  "id": "loan_uuid",
  "escrow_id": "12345",
  "status": "verification_pending",
  "created_at": "2024-..."
}
```

---

## Test with Postman Collection

Import the test collection:

```bash
# Generate OpenAPI spec
pnpm generate:openapi

# Import into Postman from:
# http://localhost:3000/api/v1/docs/openapi.json
```

---

## Common Issues

### Issue: "Worker not registered on-chain"

**Solution:** Worker must call `LendiProof.registerWorker()` on-chain first.

```solidity
// On-chain call needed (from frontend or hardhat)
await lendiProof.registerWorker();
```

### Issue: "SIGNER_PRIVATE_KEY required for LendiProofGateClient"

**Solution:** Add `SIGNER_PRIVATE_KEY` to `.env`

### Issue: "Invalid token"

**Solution:** Token expired or not provided. Request new nonce and verify wallet again.

### Issue: Port 3000 already in use

**Solution:** Change PORT in `.env`:
```bash
PORT=3001
```

---

## Database Testing

### Using Memory Storage (Default)

```bash
DB_PROVIDER=memory
```

Data resets on server restart. Good for quick testing.

### Using Postgres

```bash
DB_PROVIDER=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/lendi_dev
```

Run migrations:
```bash
pnpm db:push
```

View database:
```bash
pnpm db:studio
```

---

## Next Steps

After local testing passes:
- Proceed to **Paso 7**: Register backend signer as lender
- Proceed to **Paso 8**: Configure QuickNode stream
- Proceed to **Paso 10**: E2E testing on testnet
