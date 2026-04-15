# End-to-End Testing Guide — Lendi Backend Wave 2

## Paso 10: E2E Testing on Testnet

Este documento describe cómo probar el flujo completo de verificación de ingresos con FHE en Arbitrum Sepolia.

---

## Prerequisites

Before starting E2E tests, ensure:

- ✅ Backend deployed: https://lendi-origins.vercel.app
- ✅ Backend signer registered as lender (Paso 7)
- ✅ QuickNode stream configured (Paso 8)
- ✅ Testnet ETH on Arbitrum Sepolia
- ✅ Access to worker wallet for testing

---

## Test Flow Overview

```
1. Worker Registration (On-chain)
   ↓
2. Worker Registration (Backend)
   ↓
3. Income Recording (On-chain)
   ↓
4. Loan Creation (Backend + On-chain)
   ↓
5. FHE Verification (3-step flow)
   ↓
6. Condition Check & Escrow Settlement
```

---

## Step-by-Step Testing

### Step 1: Setup Test Wallets

You'll need 3 wallets:
- **Worker Wallet**: Will register and record income
- **Lender Wallet**: Will create loan request
- **Backend Signer**: Already configured (from SIGNER_PRIVATE_KEY)

Get testnet ETH from faucet:
```
https://arbitrum-sepolia.bridge.io
```

### Step 2: Register Worker On-Chain

Using Hardhat console or frontend:

```typescript
// Connect to LendiProof contract
const lendiProof = await ethers.getContractAt(
  'LendiProof',
  '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4'
);

// Worker wallet calls registerWorker
await lendiProof.connect(workerWallet).registerWorker();

// Verify registration
const isRegistered = await lendiProof.registeredWorkers(workerWallet.address);
console.log('Worker registered:', isRegistered); // Should be true
```

Expected result:
```
✅ Worker registered on-chain
✅ Event emitted: WorkerRegistered(address worker)
```

---

### Step 3: Register Worker in Backend

```bash
# First, get authentication token
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0xWorkerAddress"}'

# Sign the message with worker wallet
# Then verify:
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0xWorkerAddress",
    "signature": "0x...",
    "message": "..."
  }'

# Save the access_token

# Create worker in backend
curl -X POST https://lendi-origins.vercel.app/api/v1/workers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "wallet_address": "0xWorkerAddress"
  }'
```

Expected result:
```json
{
  "id": "worker_uuid",
  "wallet_address": "0xWorkerAddress",
  "status": "active",
  "created_at": "2024-..."
}
```

---

### Step 4: Record Income On-Chain (Encrypted)

Worker records encrypted income:

```typescript
// Amount to record (in USDC, 6 decimals)
const incomeAmount = 1000; // $1000 USDC
const amountWithDecimals = ethers.parseUnits(incomeAmount.toString(), 6);

// Encrypt the amount using FHE
// Note: This requires fhevmjs or similar library
const encryptedAmount = await fhevm.encrypt64(amountWithDecimals);

// Record income on LendiProof
await lendiProof.connect(workerWallet).recordIncome(encryptedAmount);

// Event emitted: IncomeRecorded(address worker, uint256 timestamp)
```

**QuickNode Webhook Triggered:**
- Backend receives `IncomeRecorded` event
- Updates worker's `updatedAt` timestamp in DB
- **Does NOT store amount** (privacy preserved)

Check backend logs:
```bash
vercel logs --follow | grep "IncomeRecorded"
```

Expected:
```
Processing IncomeRecorded event
Updated worker after IncomeRecorded event
```

---

### Step 5: Create Loan Request (Backend API)

Lender creates loan via backend API:

```bash
# Get lender auth token (same process as worker)
# Then create loan:

curl -X POST https://lendi-origins.vercel.app/api/v1/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <lender_access_token>" \
  -d '{
    "worker_id": "worker_uuid",
    "lender_id": "lender_uuid",
    "worker_address": "0xWorkerAddress",
    "beneficiary": "0xWorkerAddress",
    "loan_amount_usdc": 500,
    "threshold_usdc": 800
  }'
```

**Backend Process:**
1. ✅ Verifies worker is registered on-chain
2. ✅ Creates escrow in ReinieraOS
3. ✅ Gate automatically calls `linkEscrow()` via `onConditionSet()`
4. ✅ Requests FHE verification
5. ✅ Triggers off-chain decryption (async)
6. ✅ Saves loan with status `verification_pending`

Expected response:
```json
{
  "id": "loan_uuid",
  "escrow_id": "12345",
  "worker_id": "worker_uuid",
  "lender_id": "lender_uuid",
  "status": "verification_pending",
  "created_at": "2024-..."
}
```

**Events Emitted:**
- `EscrowCreated` (ReinieraOS)
- `EscrowLinked` (LendiProof)
- `ProofRequested` (LendiProofGate)

---

### Step 6: FHE Verification Flow (3 Steps)

This happens automatically after loan creation:

#### Step 1: Request Verification (Backend)
```typescript
// Backend calls LendiProofGate.requestVerification(escrowId)
// - Calls proveIncome() on LendiProof
// - Stores encrypted ebool handle
// - Calls FHE.allowPublic() to prepare for decryption
```

#### Step 2: Off-Chain Decryption (Backend)
```typescript
// Backend uses @cofhe/sdk
const { decryptedValue, signature } = await cofhe
  .decryptForTx(handle, FheTypes.Bool)
  .execute();

// decryptedValue = true if worker income >= threshold
//                 false if worker income < threshold
```

#### Step 3: Publish Result (Backend)
```typescript
// Backend calls LendiProofGate.publishVerification(escrowId, result, signature)
// - Calls FHE.publishDecryptResult()
// - Stores result on-chain
```

**Expected timeline:** 10-30 seconds for complete FHE flow

---

### Step 7: Check Verification Result

Query the loan status:

```bash
curl https://lendi-origins.vercel.app/api/v1/loans/<loan_uuid>
```

Expected:
```json
{
  "id": "loan_uuid",
  "escrow_id": "12345",
  "status": "verification_pending", // or "active" if completed
  "created_at": "2024-..."
}
```

Check on-chain if condition is met:

```typescript
const gate = await ethers.getContractAt(
  'LendiProofGate',
  '0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc'
);

const escrowId = 12345;
const isConditionMet = await gate.isConditionMet(escrowId);
console.log('Condition met:', isConditionMet);

// true  = Worker income >= threshold → Loan approved
// false = Worker income < threshold  → Loan denied
```

---

### Step 8: Escrow Settlement

If condition is met (`isConditionMet = true`):

```typescript
// Anyone can settle the escrow (usually worker)
const escrow = await ethers.getContractAt(
  'ConfidentialEscrow',
  '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa'
);

await escrow.settle(escrowId);

// Funds released to worker (beneficiary)
// Event: EscrowSettled(uint256 escrowId, address beneficiary)
```

Backend receives `EscrowSettled` webhook and updates loan status to `active`.

---

## Test Scenarios

### Scenario 1: Approved Loan (Income >= Threshold)

```
Worker Income:     $1000 (encrypted on-chain)
Loan Threshold:    $800
Expected Result:   ✅ Condition met = true
                  ✅ Loan approved
                  ✅ Escrow can be settled
```

### Scenario 2: Denied Loan (Income < Threshold)

```
Worker Income:     $500 (encrypted on-chain)
Loan Threshold:    $800
Expected Result:   ❌ Condition met = false
                  ❌ Loan denied
                  ❌ Escrow cannot be settled
```

### Scenario 3: Multiple Income Records

```
1. Worker records $300
2. Worker records $400
3. Worker records $300
Total: $1000

Loan Threshold: $800
Expected: Last recorded income ($300) is checked
Result: ❌ Denied (only last income counts)
```

**Note:** Current implementation only checks the LAST recorded income, not cumulative.

---

## Verification Checklist

Use this checklist to verify each component:

### On-Chain Verification
- [ ] Worker registered (`registeredWorkers(address) = true`)
- [ ] Income recorded (`IncomeRecorded` event emitted)
- [ ] Escrow created (ReinieraOS)
- [ ] Escrow linked to worker (`escrowToWorker(escrowId) = worker`)
- [ ] Verification requested (`ProofRequested` event)
- [ ] Result published (`isConditionMet(escrowId)` returns bool)

### Backend Verification
- [ ] Worker exists in database
- [ ] Worker `updatedAt` updated after income event
- [ ] Loan created with correct escrow_id
- [ ] Loan status = `verification_pending`
- [ ] FHE decryption executed successfully
- [ ] No income amounts stored in database

### Webhook Verification
- [ ] QuickNode stream delivering events
- [ ] Backend receiving events (check logs)
- [ ] HMAC signature validation passing
- [ ] Events processed without errors

### Privacy Verification
- [ ] ✅ Income amounts NEVER in backend database
- [ ] ✅ Only timestamps, addresses, tx hashes stored
- [ ] ✅ Encrypted amounts remain on-chain only
- [ ] ✅ FHE decryption happens in RAM only

---

## Debugging Common Issues

### Issue: "Worker not registered on-chain"

**Check:**
```typescript
const isRegistered = await lendiProof.registeredWorkers(workerAddress);
console.log(isRegistered); // Should be true
```

**Fix:** Call `lendiProof.registerWorker()` from worker wallet

---

### Issue: "FHE decryption timeout"

**Check:** Backend logs for FHE service errors

**Possible causes:**
- Network congestion (Arbitrum Sepolia)
- CoFHE SDK initialization issues
- RPC rate limits

**Fix:** Wait and retry, or check RPC_URL configuration

---

### Issue: "Condition not met" (unexpected)

**Debug:**
```typescript
// Check recorded income
const lastIncome = await lendiProof.workerIncomes(workerAddress);
console.log('Last income handle:', lastIncome);

// Check threshold
const threshold = await lendiProof.escrowToThreshold(escrowId);
console.log('Threshold:', threshold);

// Manually trigger verification
await gate.requestVerification(escrowId);
```

---

### Issue: QuickNode webhooks not arriving

**Check:**
1. Stream is active in QuickNode dashboard
2. Contract address matches: `0x809B8FC3C0e12f8F1b280E8A823294F98760fad4`
3. Network is Arbitrum Sepolia
4. Webhook URL is correct
5. Backend logs show signature validation

**Fix:** Test webhook manually from QuickNode dashboard

---

## Performance Benchmarks

Expected timings on Arbitrum Sepolia:

```
Worker Registration:        ~2-5 seconds
Income Recording:           ~3-7 seconds
Escrow Creation:            ~5-10 seconds
FHE Verification Request:   ~3-5 seconds
FHE Decryption:             ~10-30 seconds
Result Publication:         ~3-5 seconds
-------------------------------------------
Total Loan Creation Flow:   ~25-60 seconds
```

---

## Test Data Template

Use this template for systematic testing:

```typescript
// Test Case 1: Approved Loan
const testCase1 = {
  workerAddress: '0x...',
  lenderAddress: '0x...',
  incomeAmount: 1000, // $1000
  loanAmount: 500,    // $500
  threshold: 800,     // $800
  expectedResult: true, // Approved
};

// Test Case 2: Denied Loan
const testCase2 = {
  workerAddress: '0x...',
  lenderAddress: '0x...',
  incomeAmount: 500,  // $500
  loanAmount: 800,    // $800
  threshold: 800,     // $800
  expectedResult: false, // Denied
};

// Test Case 3: Edge Case (Exact Threshold)
const testCase3 = {
  workerAddress: '0x...',
  lenderAddress: '0x...',
  incomeAmount: 800,  // $800
  loanAmount: 500,    // $500
  threshold: 800,     // $800
  expectedResult: true, // Approved (income >= threshold)
};
```

---

## Success Criteria

E2E testing is complete when:

- ✅ Worker can register and record income
- ✅ Lender can create loan requests
- ✅ Escrows are created automatically
- ✅ FHE verification completes successfully
- ✅ Approved loans show `isConditionMet = true`
- ✅ Denied loans show `isConditionMet = false`
- ✅ Escrows can be settled when approved
- ✅ All webhooks are received and processed
- ✅ **ZERO income amounts stored in database**

---

## Next Steps After Testing

Once E2E tests pass:

1. Document any edge cases discovered
2. Update frontend to integrate with backend API
3. Consider production deployment (mainnet)
4. Setup monitoring and alerts
5. Create user documentation

---

## Support

**Backend Logs:**
```bash
vercel logs --follow
```

**Contract Verification:**
https://sepolia.arbiscan.io/

**Test RPC:**
https://sepolia-rollup.arbitrum.io/rpc

**Backend API:**
https://lendi-origins.vercel.app/api/v1/docs/openapi.json
