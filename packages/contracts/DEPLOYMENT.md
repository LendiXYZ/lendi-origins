# Lendi Contracts - Wave 2 Deployment

## Network: Arbitrum Sepolia

**Deployed:** April 18, 2026
**Deployer:** `0x799795DDef56d71A4d98Fac65cb88B7389614aBC`

---

## 🎉 Wave 2 Features

**New in Wave 2 (April 18, 2026):**

1. **IncomeSource Enum** - Track verification method (MANUAL=0, PRIVARA=1, BANK_LINK=2, PAYROLL=3)
2. **Updated recordIncome()** - Now requires `source` parameter (uint8)
3. **3 New Getter Functions** - Enable frontend to read encrypted worker data:
   - `getMyMonthlyIncome()` - Returns euint64 handle for worker's income
   - `getSealedMonthlyIncome(address)` - Returns sealed income for lender
   - `getMyTxCount()` - Returns transaction count handle
4. **Updated IncomeRecorded Event** - Now emits `source` field (indexed)
5. **26/26 Contract Tests Passing** - Full test coverage including new features

**Breaking Changes from Wave 1:**
- All contract addresses changed (LendiProof, LendiProofGate, LendiPolicy)
- `recordIncome()` signature changed (now requires source parameter)
- Event structure updated (IncomeRecorded now includes source)
- Backend must update ABIs and handle new enum values

---

## 📋 Table of Contents

1. [Deployed Addresses](#deployed-addresses)
2. [How to Deploy](#how-to-deploy)
3. [How to Verify](#how-to-verify)
4. [Configuration for Backend](#configuration-for-backend)
5. [Contract Features](#contract-features)
6. [Integration with ReinieraOS](#integration-with-reineiraos)
7. [Test Results](#test-results)
8. [Security Notes](#security-notes)

---

## How to Deploy

### Prerequisites

1. **Environment Setup**

Create a `.env` file in the contracts directory:

```env
PRIVATE_KEY=0x...  # Your deployer private key
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=...  # Get from https://arbiscan.io/myapikey
```

2. **Get Testnet ETH**

Get Arbitrum Sepolia ETH from:
- [Arbitrum Bridge](https://bridge.arbitrum.io/)
- [Alchemy Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)
- [QuickNode Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

Minimum recommended: ~0.2 ETH for deployment + gas

3. **Verify Node Modules**

```bash
pnpm install
```

### Step-by-Step Deployment

#### Step 1: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 11 Solidity files successfully (evm target: cancun).
```

#### Step 2: Run Tests (Optional but Recommended)

```bash
npx hardhat test
```

Expected: 52 tests passing

#### Step 3: Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.ts --network arb-sepolia
```

**What happens during deployment:**

1. Deploys `LendiProof` with USDC address
2. Deploys `LendiProofGate` with LendiProof address
3. Registers deployer as lender (free via `registerLenderByOwner`)
4. Registers gate as lender (free via `registerLenderByOwner`)
5. Deploys `LendiPolicy`
6. Prints deployment summary with verification commands

**Expected output:**

```
Deploying contracts with account: 0x799795DDef56d71A4d98Fac65cb88B7389614aBC
Account balance: 219873213162100000
Network: arb-sepolia
Using USDC at: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

Deploying LendiProof...
LendiProof deployed to: 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac

Deploying LendiProofGate...
LendiProofGate deployed to: 0x06b0523e63FF904d622aa6d125FdEe11201Bf791

Registering deployer as lender (free by owner)...
Deployer registered as lender: 0x799795DDef56d71A4d98Fac65cb88B7389614aBC

Registering gate as lender (free by owner)...
Gate registered as lender: 0x06b0523e63FF904d622aa6d125FdEe11201Bf791

Deploying LendiPolicy...
LendiPolicy deployed to: 0x68AE6d292553C0fBa8e797c0056Efe56038227A1

=== Deployment Summary ===
...
```

⚠️ **IMPORTANT:** Save the contract addresses from the output!

---

## How to Verify

### Automatic Verification (Recommended)

The deployment script provides verification commands. Run them **one by one**:

#### 1. Verify LendiProof

```bash
npx hardhat verify --network arb-sepolia \
  0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

**Parameters:**
- First address: LendiProof contract address
- Second address: USDC token address (constructor parameter)

**Expected output:**
```
Successfully verified contract LendiProof on the block explorer.
https://sepolia.arbiscan.io/address/0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac#code
```

#### 2. Verify LendiProofGate

```bash
npx hardhat verify --network arb-sepolia \
  0x06b0523e63FF904d622aa6d125FdEe11201Bf791 \
  0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac
```

**Parameters:**
- First address: LendiProofGate contract address
- Second address: LendiProof contract address (constructor parameter)

**Expected output:**
```
Successfully verified contract LendiProofGate on the block explorer.
https://sepolia.arbiscan.io/address/0x06b0523e63FF904d622aa6d125FdEe11201Bf791#code
```

#### 3. Verify LendiPolicy

```bash
npx hardhat verify --network arb-sepolia \
  0x68AE6d292553C0fBa8e797c0056Efe56038227A1
```

**Parameters:**
- Only contract address (no constructor parameters)

**Expected output:**
```
Successfully verified contract LendiPolicy on the block explorer.
https://sepolia.arbiscan.io/address/0x68AE6d292553C0fBa8e797c0056Efe56038227A1#code
```

### Manual Verification (If Automatic Fails)

If automatic verification fails, you can verify manually on Arbiscan:

1. Go to https://sepolia.arbiscan.io/
2. Search for your contract address
3. Click "Contract" tab → "Verify and Publish"
4. Fill in:
   - **Compiler Type:** Solidity (Single file)
   - **Compiler Version:** v0.8.25+commit.b61c2a91
   - **Open Source License Type:** MIT
   - **Optimization:** Yes (200 runs)
   - **EVM Version:** cancun
5. Paste the flattened contract code:

```bash
npx hardhat flatten contracts/LendiProof.sol > LendiProof_flat.sol
```

6. Add constructor arguments (ABI-encoded):
   - For LendiProof: USDC address
   - For LendiProofGate: LendiProof address
   - For LendiPolicy: (none)

### Troubleshooting Verification

**Issue: "Already Verified"**
- Solution: Contract is already verified, no action needed

**Issue: "Compilation error"**
- Check compiler version matches: 0.8.25
- Check EVM version is: cancun
- Ensure optimization is enabled with 200 runs

**Issue: "Constructor arguments mismatch"**
- Use ABI-encoded constructor args:
```bash
# For LendiProof (USDC address)
cast abi-encode "constructor(address)" 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# For LendiProofGate (LendiProof address)
cast abi-encode "constructor(address)" 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac
```

---

## Deployed Addresses

## Contract Addresses

| Contract | Address | Verified |
|----------|---------|----------|
| **USDC (Circle)** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | ✅ |
| **LendiProof** | `0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac` | ✅ [View](https://sepolia.arbiscan.io/address/0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac#code) |
| **LendiProofGate** | `0x06b0523e63FF904d622aa6d125FdEe11201Bf791` | ✅ [View](https://sepolia.arbiscan.io/address/0x06b0523e63FF904d622aa6d125FdEe11201Bf791#code) |
| **LendiPolicy** | `0x68AE6d292553C0fBa8e797c0056Efe56038227A1` | ✅ [View](https://sepolia.arbiscan.io/address/0x68AE6d292553C0fBa8e797c0056Efe56038227A1#code) |

## Configuration for Backend

Add these to your `.env`:

```env
# Lendi Contracts - Wave 2
LENDI_PROOF_ADDRESS=0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac
LENDI_PROOF_GATE_ADDRESS=0x06b0523e63FF904d622aa6d125FdEe11201Bf791
LENDI_POLICY_ADDRESS=0x68AE6d292553C0fBa8e797c0056Efe56038227A1
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# ReinieraOS Core (already deployed)
ESCROW_CONTRACT_ADDRESS=0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
COVERAGE_MANAGER_ADDRESS=0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6
POOL_FACTORY_ADDRESS=0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
POLICY_REGISTRY_ADDRESS=0xf421363B642315BD3555dE2d9BD566b7f9213c8E
CONFIDENTIAL_USDC_ADDRESS=0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f

# Blockchain
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
CHAIN_ID=421614
```

## Registered Lenders

The following addresses are registered as lenders (can call `proveIncome()` and `linkEscrow()`):

1. **Deployer (Owner):** `0x799795DDef56d71A4d98Fac65cb88B7389614aBC` ✅
2. **LendiProofGate:** `0x06b0523e63FF904d622aa6d125FdEe11201Bf791` ✅

> **Note:** Backend signer must be registered via `registerLenderByOwner()` before it can create escrows.

## Contract Features

### LendiProof
- ✅ Worker registration (free)
- ✅ Lender registration (1 USDC fee or free by owner)
- ✅ FHE encrypted income tracking
- ✅ Income verification (proveIncome returns ebool)
- ✅ Escrow linking (uint256 escrowId)
- ✅ Monthly income reset (30-day period)

### LendiProofGate
- ✅ IConditionResolver implementation
- ✅ 3-step FHE decryption flow:
  - `requestVerification()` - Initiates verification
  - Off-chain decrypt with CoFHE SDK
  - `publishVerification()` - Publishes result with signature
  - `isConditionMet()` - Returns published result (view ✓)
- ✅ ERC-165 interface detection
- ✅ `onConditionSet()` for ReinieraOS integration

### LendiPolicy
- ✅ IUnderwriterPolicy implementation
- ✅ Fixed 5% risk score (Wave 2)
- ✅ Always approves coverage (Wave 2)
- ✅ ERC-165 interface detection
- 🔜 Dynamic risk scoring (Wave 3)

## Integration with ReinieraOS

### Creating an Escrow with Income Verification

```typescript
import { ReineiraSDK } from '@reineira-os/sdk';

const sdk = new ReineiraSDK({ network: 'arbitrum-sepolia' });

// Encode condition data: 20 bytes address + 8 bytes uint64 threshold
const conditionData = ethers.concat([
  ethers.zeroPadValue(workerAddress, 20),
  ethers.zeroPadValue(ethers.toBeHex(thresholdUSDC * 1_000_000, 8), 8)
]);

const escrow = await sdk.escrow
  .build()
  .amount(sdk.usdc(loanAmountUSDC))
  .owner(workerAddress)
  .condition('0x06b0523e63FF904d622aa6d125FdEe11201Bf791', conditionData)
  .create();

// escrow.id is the uint256 escrowId
```

### Verification Flow

```typescript
import { createCofheClient, createCofheConfig, FheTypes } from '@cofhe/sdk';

// 1. Request verification
await gate.requestVerification(escrowId);

// 2. Get encrypted handle
const handle = await gate.getEncryptedHandle(escrowId);

// 3. Decrypt off-chain
const client = await createCofheClient(config);
const { decryptedValue, signature } = await client
  .decryptForTx(handle)
  .withoutPermit()
  .execute();

// 4. Publish result
const qualifies = decryptedValue === 1n;
await gate.publishVerification(escrowId, qualifies, signature);

// 5. Check condition (called by ReinieraOS)
const isMet = await gate.isConditionMet(escrowId); // true/false
```

## Test Results

All 26 tests passing ✅ (Wave 2)

**Breakdown:**
- LendiProof: 10 tests (registration, income recording with source, getters)
- LendiProofGate: 9 tests (verification flow, condition resolution)
- LendiPolicy: 7 tests (risk scoring, coverage approval)

**New Tests in Wave 2:**
- `recordIncome` with source parameter validation
- `getMyMonthlyIncome()` returns correct encrypted handle
- `getSealedMonthlyIncome()` works for lender queries
- `getMyTxCount()` tracks transaction count correctly
- IncomeRecorded event emits source field

## Security Notes

⚠️ **Privacy Constraint:**
- ✅ CAN store: worker addresses, income timestamps, tx hashes, escrow IDs, loan status
- ❌ NEVER store: income amounts, loan amounts, decrypted financial data

⚠️ **Access Control:**
- Only registered lenders can call `proveIncome()` and `linkEscrow()`
- Only registered workers can call `recordIncome()`
- Owner can register lenders for free via `registerLenderByOwner()`

## Post-Deployment Tasks

### Register Backend Signer as Lender

Once you have your backend signer address, register it:

```typescript
// Using ethers.js
const lendiProof = await ethers.getContractAt(
  'LendiProof',
  '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac'
);

const backendAddress = process.env.BACKEND_SIGNER_ADDRESS;
await lendiProof.registerLenderByOwner(backendAddress);
```

Or via Hardhat task:

```bash
npx hardhat run scripts/register-lender.ts --network arb-sepolia
```

### Verify Deployment with Read Calls

Test that contracts are working:

```bash
# Check if worker is registered
cast call 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  "registeredWorkers(address)(bool)" \
  0xYourWorkerAddress \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Check if lender is registered
cast call 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  "registeredLenders(address)(bool)" \
  0xYourLenderAddress \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Get base risk score from policy
cast call 0x68AE6d292553C0fBa8e797c0056Efe56038227A1 \
  "BASE_RISK_SCORE()(uint256)" \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Update Environment Files

After deployment, update these files:

1. **Backend `.env`:**
```bash
cd ../../backend
# Add deployed addresses to .env
```

2. **Frontend `.env`:**
```bash
cd ../../app
# Add deployed addresses to .env
```

3. **Contracts `.env`:**
```bash
# Add for future reference
LENDI_PROOF_ADDRESS=0x809B8FC3C0e12f8F1b280E8A823294F98760fad4
LENDI_PROOF_GATE_ADDRESS=0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc
LENDI_POLICY_ADDRESS=0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E
```

## Useful Commands

### Check Contract on Arbiscan

```bash
# Open LendiProof in browser
open https://sepolia.arbiscan.io/address/0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac#code

# Open LendiProofGate in browser
open https://sepolia.arbiscan.io/address/0x06b0523e63FF904d622aa6d125FdEe11201Bf791#code

# Open LendiPolicy in browser
open https://sepolia.arbiscan.io/address/0x68AE6d292553C0fBa8e797c0056Efe56038227A1#code
```

### Interact with Contracts via Cast

```bash
# Register as worker (free)
cast send 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  "registerWorker()" \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY

# Check escrow linkage
cast call 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  "escrowToWorker(uint256)(address)" \
  1 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Check escrow threshold
cast call 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac \
  "escrowToThreshold(uint256)(uint64)" \
  1 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Re-verify Contracts (If Needed)

If you need to re-verify after source code changes:

```bash
# Clean and recompile
npx hardhat clean
npx hardhat compile

# Re-verify (will say "Already verified" if already done)
npx hardhat verify --network arb-sepolia 0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

## Gas Costs Reference

Approximate gas costs on Arbitrum Sepolia:

| Operation | Gas Used | Cost (at 0.1 gwei) |
|-----------|----------|-------------------|
| Deploy LendiProof | ~3.5M | ~0.00035 ETH |
| Deploy LendiProofGate | ~2.8M | ~0.00028 ETH |
| Deploy LendiPolicy | ~1.2M | ~0.00012 ETH |
| Register Worker | ~50k | ~0.000005 ETH |
| Register Lender (owner) | ~45k | ~0.0000045 ETH |
| Record Income | ~120k | ~0.000012 ETH |
| Request Verification | ~85k | ~0.0000085 ETH |
| Publish Verification | ~95k | ~0.0000095 ETH |
| **Total Deployment** | ~7.5M | ~**0.00075 ETH** |

## Deployment Checklist

- [x] Compile contracts successfully
- [x] All 52 tests passing
- [x] Get Arbitrum Sepolia ETH (~0.2 ETH)
- [x] Configure `.env` with PRIVATE_KEY and ARBISCAN_API_KEY
- [x] Deploy LendiProof with USDC address
- [x] Deploy LendiProofGate with LendiProof address
- [x] Deploy LendiPolicy
- [x] Register deployer as lender
- [x] Register gate as lender
- [x] Verify LendiProof on Arbiscan
- [x] Verify LendiProofGate on Arbiscan
- [x] Verify LendiPolicy on Arbiscan
- [ ] Register backend signer as lender
- [ ] Update backend `.env` with addresses
- [ ] Update frontend `.env` with addresses
- [ ] Test integration with ReinieraOS SDK

## Next Steps

1. ✅ Deploy contracts to Arbitrum Sepolia
2. ✅ Verify contracts on Arbiscan
3. 🔲 Register backend signer as lender
4. 🔲 Build backend API (SIWE auth, escrow creation, FHE verification)
5. 🔲 Integrate frontend with deployed contracts
6. 🔲 Wave 3: Implement dynamic risk scoring based on repayment history

---

## Support & Resources

- **Arbitrum Sepolia Explorer:** https://sepolia.arbiscan.io/
- **Hardhat Docs:** https://hardhat.org/docs
- **CoFHE SDK Docs:** https://cofhe-docs.fhenix.zone/
- **ReinieraOS Docs:** (private beta)
- **Issues:** Report at project repository
