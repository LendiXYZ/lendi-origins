# Lendi - Complete System Architecture

**Version:** Wave 2
**Network:** Arbitrum Sepolia (Testnet)
**Status:** Production Ready
**Date:** April 15, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#-current-implementation-status)
3. [Known Limitations & Roadmap](#️-known-limitations--roadmap)
4. [Contract Architecture](#contract-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Complete User Flow](#complete-user-flow)
7. [Technical Data Flow](#technical-data-flow)
8. [Privacy and FHE](#privacy-and-fhe)
9. [ReinieraOS Integration](#reineraos-integration)
10. [Use Cases](#use-cases)
11. [Sequence Diagrams](#sequence-diagrams)
12. [Regulatory & Business Context](#-regulatory--business-context)
13. [Questions for Privara/ReinieraOS Team](#-questions-for-privarareineira-os-team)
14. [Conclusion](#conclusion)

---

## 🎯 Overview

### What is Lendi?

Lendi is a P2P lending platform for informal workers in LATAM that allows:

- **Workers**: Prove their income WITHOUT revealing exact amounts
- **Lenders**: Grant loans with cryptographic guarantee of income
- **Privacy-First**: All financial information is encrypted with FHE (Fully Homomorphic Encryption)

### Problem Being Solved

Informal workers (60% of LATAM) cannot access credit because:
- They don't have formal income statements
- Banks require payroll documentation
- Traditional platforms require full transparency

**Lendi's Solution:**
- Worker records encrypted income on-chain
- System verifies if income >= threshold WITHOUT decrypting
- Lender gets mathematical guarantee without knowing amounts

---

## 📊 Current Implementation Status

### What's Built and Deployed

#### ✅ Smart Contracts (Arbitrum Sepolia)

**LendiProof** (`0x809B8FC3C0e12f8F1b280E8A823294F98760fad4`)
- ✅ Worker/lender registration
- ✅ FHE-encrypted income recording with `euint64`
- ✅ Homomorphic income accumulation (`FHE.add`)
- ✅ Encrypted income verification (`FHE.gte`)
- ✅ Escrow linking to workers
- ✅ Monthly reset mechanism (30-day cycle)
- ✅ ACL-based access control (`FHE.allow`, `FHE.allowThis`)

**LendiProofGate** (`0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc`)
- ✅ ReinieraOS `IConditionResolver` implementation
- ✅ 3-step FHE verification flow (request → decrypt → publish)
- ✅ Automatic escrow linking via `onConditionSet` hook
- ✅ Uses `FHE.allowPublic()` + `FHE.publishDecryptResult()` for secure decryption
- ✅ Uses `FHE.getDecryptResultSafe()` to read published results
- ⚠️ **Missing access control modifiers** (no `onlyBackend`, no `onlyEscrowContract`) - identified in W2 finding
- ⚠️ **Not E2E tested with actual ReinieraOS escrow** - interface implemented but integration not confirmed

**LendiPolicy** (`0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E`)
- ✅ Basic premium calculation structure
- ✅ Fee recipient management
- ⚠️ **Stub implementation** (fixed 5%, always approves - see Known Limitations)

#### ✅ Backend Infrastructure (https://lendi-origins.vercel.app)

**Production Services:**
- ✅ Clean Architecture (DDD) with domain/application/infrastructure separation
- ✅ SIWE authentication (Sign-In with Ethereum)
- ✅ JWT token management (access + refresh tokens)
- ✅ Nonce service for replay protection
- ✅ LendiProof blockchain client (read/write via viem 2.x)
- ✅ LendiProofGate client for verification flow
- ✅ FHE decryption service (@cofhe/sdk 0.4)
- ✅ ReinieraOS SDK integration for escrow creation
- ✅ CreateLoan use case (complete flow)
- ✅ Worker/Lender registration endpoints
- ✅ Loan status tracking
- ✅ Vercel serverless deployment
- ✅ Drizzle ORM with Neon Postgres (production) or in-memory (testing)

**Backend Signer:**
- ✅ Registered as lender on-chain (1 USDC fee paid)
- ✅ Can create escrows and link to workers
- ✅ Can decrypt FHE results and publish verifications

**Testing:**
- ✅ 10/10 automated tests passing (100% success rate)
- ✅ E2E test coverage: auth, worker registration, lender registration, loan creation, FHE verification
- ✅ Local testing scripts with detailed validation
- ✅ Comprehensive test documentation

#### ⏸️ Frontend (In Progress)

**Planned Integration:**
- React 19 + ZeroDev (passkey auth)
- @cofhe/sdk for client-side FHE encryption
- Wallet connection and SIWE authentication
- Income recording UI
- Loan request flow
- Status polling for verification results

### Test Results Summary

**Smart Contract Tests (Hardhat):**
```
✅ LendiProof: 24 tests passing
   - Worker/lender registration
   - FHE income recording with permissions
   - Income verification (proveIncome)
   - Escrow linking
   - Monthly reset functionality
   - Access control modifiers

✅ LendiProofGate: 14 tests passing
   - onConditionSet hook
   - 3-step verification flow
   - FHE.allowPublic + publishDecryptResult
   - isConditionMet with getDecryptResultSafe
   - Error handling (revert cases)

✅ LendiPolicy: 17 tests passing
   - Risk evaluation (fixed 5%)
   - Judge function (always true)
   - Interface detection (ERC-165)

Total: 55 smart contract tests passing
```

**Backend Integration Tests (TypeScript):**
```
✅ Auth Flow Tests:
   - Request nonce for wallet
   - Verify wallet signature (SIWE)
   - Refresh access token
   - Handle invalid signatures

✅ Worker Tests:
   - Create worker with address
   - Get worker by ID
   - Verify on-chain registration

✅ Lender Tests:
   - Create lender with address
   - Get lender by ID
   - Verify on-chain registration

✅ Loan Tests:
   - Create loan with escrow
   - Get loan by ID
   - Verify FHE verification flow
   - Track loan status updates

Backend tests: PASSED (10/10)
```

**Integration Gaps:**
- ⚠️ No end-to-end test with actual ReinieraOS escrow creation/settlement
- ⚠️ FHE decryption tested in isolation but not integrated with live CoFHE network
- ⚠️ Privara adapter integration not tested (no test payment rails available)

---

## ⚠️ Known Limitations & Roadmap

This section documents critical findings from technical review and planned improvements.

### Implementation Differences vs. Initial Design

**Important:** The current deployed implementation differs from the initial architectural design in several key areas. These differences reflect Wave 2 simplifications and reveal security gaps identified in the technical review.

#### Access Control Modifiers
**Initial Design:** Gate functions had `onlyBackend` and `onlyEscrowContract` modifiers
**Current Implementation:** These modifiers are not present in deployed contracts
**Impact:** W2 finding (binary search attack) - anyone can call `requestVerification()`

#### FHE Decryption Flow
**Initial Design:** Separate `verificationResults` and `conditionsMet` mappings
**Current Implementation:** Uses single `escrowToQualifies` mapping + `FHE.getDecryptResultSafe()` for reading published results
**Impact:** Simpler, relies on CoFHE network's decrypt result storage

#### Condition Data Encoding
**Initial Design:** Used `abi.decode()` for condition data
**Current Implementation:** Manual byte slicing (`bytes20(conditionData[0:20])`, `bytes8(conditionData[20:28])`)
**Impact:** More explicit, includes length validation (28 bytes exactly)

#### LendiPolicy Interface
**Initial Design:** `calculatePremium()` and `getFeeRecipient()` functions
**Current Implementation:** Implements ReinieraOS `IUnderwriterPolicy` with `evaluateRisk()` and `judge()`
**Impact:** Better ReinieraOS integration, but both are stubs (W8 finding)

### Critical Priority

#### W1 — Self-Reported Income (Critical)
**Current:** `recordIncome()` accepts encrypted amounts directly from workers without external verification.
**Risk:** Workers can submit inflated income claims, defeating underwriting integrity.
**Planned Fix:** Integrate Privara payment-event adapters to verify income from LATAM payment rails before encrypting and recording on-chain.
**Impact:** Ship-blocker for production deployment.
**Reference:** lendi-review.md finding W1

#### W2 — No Access Control on `requestVerification` (Critical)
**Current:** `requestVerification()` is publicly callable.
**Risk:** Binary-search attack - attacker can test arbitrary thresholds to narrow down encrypted income range.
**Planned Fix:** Add access control (only escrow owner or worker can request verification) + rate limiting.
**Impact:** Privacy degradation attack surface.
**Reference:** lendi-review.md finding W2

#### W3 — `linkEscrow` Arbitrary Overwrite (Critical)
**Current Implementation in LendiProof.sol:**
```solidity
function linkEscrow(uint256 escrowId, address worker, uint64 threshold)
    external onlyLender
{
    escrowToWorker[escrowId] = worker;  // No check if already set
    escrowToThreshold[escrowId] = threshold;
    emit EscrowLinked(escrowId, worker);
}
```
**Risk:** Malicious registered lender can reassign an existing escrow to a different worker after the original worker has been verified, effectively stealing verification results.
**Attack Scenario:**
1. Escrow 123 linked to Alice, threshold $800
2. Alice proves income >= $800, verification pending
3. Malicious lender calls `linkEscrow(123, Bob, $800)` where Bob has lower income
4. When verification completes, Bob's escrow gets approved using Alice's income proof
**Planned Fix:** Add `require(escrowToWorker[escrowId] == address(0), "Escrow already linked")` to prevent overwrites.
**Impact:** Can lead to unauthorized fund release if exploited.
**Reference:** lendi-review.md finding W3

#### W13 — Ciphertext Not Bound to Sender (Critical)
**Current:** Encrypted income not cryptographically bound to sender address.
**Risk:** Replay attack - attacker can copy another worker's encrypted income and submit as their own.
**Planned Fix:** Bind ciphertext to `msg.sender` at encryption time or verify sender-binding in `recordIncome()`.
**Impact:** Identity theft attack vector.
**Reference:** lendi-review.md finding W13

### High Priority

#### W5 — No Rolling Window for Income Freshness (High)
**Current:** Monthly reset is manual, all income treated equally regardless of timestamp.
**Risk:** Stale income (recorded months ago) treated as current, misrepresenting worker's present financial state.
**Planned Fix:** Implement rolling 30-day window, weight recent income higher, or auto-expire old entries.
**Impact:** Underwriting accuracy.
**Reference:** lendi-review.md finding W5

#### W6 — Lender Self-Registration Insufficient (High)
**Current:** Anyone can become lender by paying 1 USDC.
**Risk:** No KYC, no solvency check, no reputation tracking.
**Planned Fix:** Multi-tier lender registry with verification levels, or integrate with regulated partner (Path A: cooperativa).
**Impact:** Lender-side trust model.
**Reference:** lendi-review.md finding W6

#### W8 — LendiPolicy is Stub (High)
**Current:** Policy contract always returns fixed 5% premium, no dynamic pricing, always approves.
**Risk:** No risk-based pricing, no adaptive fee structure, no ability to reject high-risk loans.
**Planned Fix:** Implement curve-based pricing, income/threshold ratio analysis, borrower history scoring.
**Impact:** Revenue model and risk management.
**Reference:** lendi-review.md finding W8

#### W11 — No Upgradeability (High)
**Current:** Contracts don't inherit `TestnetCoreBase` (Fhenix upgradeable pattern).
**Risk:** Cannot fix critical bugs or add features post-deployment.
**Planned Fix:** Implement proxy pattern (TransparentUpgradeableProxy or UUPS) or use Fhenix's TestnetCoreBase.
**Impact:** Long-term contract maintenance.
**Reference:** lendi-review.md finding W11

### Medium Priority

#### W7 — No Transaction Count Verification
**Current:** `txCount` recorded but never validated.
**Planned Fix:** Add minimum transaction count threshold for loans (e.g., ≥3 income events).

#### W9 — No Event Indexing Strategy
**Current:** Events emitted but no backend indexing/webhook processing implemented.
**Planned Fix:** Implement QuickNode webhooks or subgraph for event processing.

#### W10 — No Loan Repayment Tracking
**Current:** No on-chain mechanism for repayment or default.
**Planned Fix:** Add repayment tracking, grace periods, cure-to-current transitions (see P1 loss history).

### Additional Technical Debt

- No protection pool or insurance mechanism (requires legal framework per Path A/B analysis)
- No lender capital pooling (fund-style structure from Path B2)
- No privacy moat contracts (P1-P9 from lendi-privacy-moat.md)
- No borrower concentration registry (P2)
- No eligibility curve implementation (P3)
- No encrypted loss history (P1)

---

## 🏗️ Contract Architecture

### Contract Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend/Dapp                         │
│               (React + @cofhe/sdk)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Smart Contracts                         │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ LendiProof   │◀─│LendiProofGate │◀─│ LendiPolicy │  │
│  │   (FHE)      │  │ (Resolver)    │  │  (Pricing)  │  │
│  └──────────────┘  └───────────────┘  └─────────────┘  │
│         │                   │                           │
│         └───────────────────┴───────────┐               │
│                                         ▼               │
│                              ┌────────────────────┐     │
│                              │   ReinieraOS       │     │
│                              │ ConfidentialEscrow │     │
│                              └────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Main Contracts

#### 1. LendiProof (Core FHE Contract)

**Address:** `0x809B8FC3C0e12f8F1b280E8A823294F98760fad4`

**Purpose:** Store encrypted income and provide FHE verification

**Key Functions:**

```solidity
// Register
function registerWorker() external
function registerLender() external payable  // 1 USDC fee

// Income Recording (FHE)
function recordIncome(InEuint64 calldata encryptedAmount) external

// Income Verification (FHE)
function proveIncome(address worker, uint64 threshold)
    external
    returns (ebool)

// Escrow Linking
function linkEscrow(
    bytes32 escrowId,
    address worker,
    uint64 threshold
) external onlyLender

// Monthly Reset (30 day cycle)
function resetMonthlyIncome() external
```

**Storage:**

```solidity
// Encrypted - NOBODY can read these
mapping(address => euint64) private monthlyIncome;
mapping(address => euint64) private txCount;

// Public registries
mapping(address => bool) public registeredWorkers;
mapping(address => bool) public registeredLenders;
mapping(uint256 => address) public escrowToWorker;
mapping(uint256 => uint64) public escrowToThreshold;
mapping(address => uint256) public lastResetTimestamp;
```

**Events:**

```solidity
event WorkerRegistered(address indexed worker);
event LenderRegistered(address indexed lender, uint256 feePaid);
event IncomeRecorded(address indexed worker, uint256 timestamp);
event ProofRequested(address indexed lender, address indexed worker);
event EscrowLinked(uint256 indexed escrowId, address indexed worker);
event MonthlyReset(address indexed worker, uint256 timestamp);
```

**FHE Features:**

- **euint64**: Income stored as encrypted uint64
- **FHE.add()**: Homomorphic addition (income1 + income2 = encrypted_sum)
- **FHE.gte()**: Homomorphic comparison (income >= threshold → ebool)
- **ebool**: Encrypted boolean (comparison result)
- **ACL**: Access Control List to manage who can decrypt what

---

#### 2. LendiProofGate (Condition Resolver)

**Address:** `0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc`

**Purpose:** Resolve FHE conditions for ReinieraOS escrows

**Implements:** `IConditionResolver` from ReinieraOS

**3-Step Flow:**

```solidity
// Step 1: Request verification (anyone can call - W2 VULNERABILITY)
function requestVerification(uint256 escrowId) external

// Step 2: Backend decrypts off-chain and publishes result
function publishVerification(
    uint256 escrowId,
    bool result,
    bytes calldata signature
) external  // ⚠️ NO onlyBackend modifier in current implementation

// Step 3: Check if condition met (view function for ReinieraOS)
function isConditionMet(uint256 escrowId)
    external
    view
    returns (bool)
```

**Storage:**

```solidity
// ⚠️ ACTUAL IMPLEMENTATION (different from initial design):
mapping(uint256 => ebool) private escrowToQualifies; // Stores encrypted handles

// Note: Uses FHE.getDecryptResultSafe(ctHash) in isConditionMet()
// instead of separate verificationResults/conditionsMet mappings
```

**ReinieraOS Hooks:**

```solidity
// Called automatically by ReinieraOS when escrow is created
function onConditionSet(
    uint256 escrowId,
    bytes calldata conditionData
) external override {  // ⚠️ NO onlyEscrowContract in current implementation
    // Validate conditionData length: 20 bytes (address) + 8 bytes (uint64)
    if (conditionData.length != 28) {
        revert InvalidConditionDataLength(conditionData.length, 28);
    }

    // Decode: first 20 bytes = worker, next 8 bytes = threshold
    address worker = address(bytes20(conditionData[0:20]));
    uint64 threshold = uint64(bytes8(conditionData[20:28]));

    // Link escrow to worker in LendiProof
    // Note: LendiProofGate must be registered as lender to call this
    lendiProof.linkEscrow(escrowId, worker, threshold);
}
```

**Key Features:**
- Acts as "private oracle" - obtains FHE result and publishes it verifiably
- Uses `FHE.allowPublic()` + `FHE.publishDecryptResult()` for secure decryption
- Uses `FHE.getDecryptResultSafe(ctHash)` to read published results in `isConditionMet()`

---

#### 3. LendiPolicy (Pricing & Fees)

**Address:** `0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E`

**Purpose:** Underwriter policy for ReinieraOS integration

**Implements:** `IUnderwriterPolicy` from ReinieraOS

**Actual Functions (Wave 2):**

```solidity
// Evaluate risk for a loan escrow
function evaluateRisk(
    uint256 escrowId,
    bytes calldata policyData
) external pure returns (uint256 riskScore)
// ⚠️ STUB: Returns fixed BASE_RISK_SCORE = 500 (5% in basis points)

// Judge whether to approve coverage
function judge(
    uint256 escrowId,
    bytes calldata policyData
) external pure returns (bool approved)
// ⚠️ STUB: Always returns true
```

**Current Implementation:**
- Fixed 5% risk score (500 basis points)
- Always approves all loans
- No dynamic pricing or risk evaluation
- Implements ERC-165 interface detection

**Planned for Wave 3:**
- Dynamic risk scoring based on worker history
- Income/threshold ratio analysis
- Loan amount limits based on income
- Conditional approval logic

---

### ReinieraOS Contracts (External Infrastructure)

**Important Note:** ReinieraOS contracts are deployed and maintained by the Reiniera team. Lendi integrates with these contracts via standardized interfaces (`IConditionResolver`, `IUnderwriterPolicy`).

#### ConfidentialEscrow

**Address:** `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa` (ReinieraOS-owned)

**Purpose:** Escrow with confidential conditions

**Integration Point:** Lendi uses ReinieraOS SDK to create escrows, passing LendiProofGate as the condition resolver.

**Expected Flow (based on IConditionResolver interface):**

```solidity
// ReinieraOS creates escrow
function createEscrow(
    uint256 amount,
    address beneficiary,
    address conditionResolver,  // Points to LendiProofGate
    bytes calldata conditionData  // Encoded: worker address + threshold
) external returns (uint256 escrowId)

// ReinieraOS calls our hook during creation
IConditionResolver(conditionResolver).onConditionSet(escrowId, conditionData);

// ReinieraOS checks condition before settling
bool canSettle = IConditionResolver(conditionResolver).isConditionMet(escrowId);

// Settle escrow (only if condition met)
function settle(uint256 escrowId) external
```

**Current Status:**
- ⚠️ ReinieraOS SDK integration is implemented in backend but **not fully tested end-to-end** with actual ReinieraOS escrow contract
- Backend has `ReinieraSDKClient` but relies on `@reiniera-os/sdk` package which may be in private beta
- No confirmed successful escrow creation → verification → settlement cycle on testnet yet

**Key Feature:** The escrow uses `conditionResolver` (LendiProofGate) to validate whether to release funds.

---

## 🖥️ Backend Architecture

### Technology Stack

```
Runtime:     Node.js 20
Language:    TypeScript 5.7
Framework:   Vercel Serverless Functions
Database:    Drizzle ORM + Neon Postgres (or Memory)
Blockchain:  viem 2.x
FHE:         @cofhe/sdk 0.4
Escrow:      @reiniera-os/sdk 0.1
Auth:        SIWE + JWT (jose)
Logging:     Pino
Deploy:      Vercel
```

### Clean Architecture (DDD)

```
src/
├── domain/              # Entities and business rules
│   ├── worker/
│   │   ├── worker.model.ts
│   │   └── worker.repository.ts (interface)
│   ├── lender/
│   ├── loan/
│   ├── escrow/
│   └── income-event/
│
├── application/         # Use cases
│   └── use-case/
│       ├── auth/
│       │   ├── request-nonce.use-case.ts
│       │   ├── verify-wallet.use-case.ts
│       │   └── refresh-token.use-case.ts
│       ├── worker/
│       │   ├── create-worker.use-case.ts
│       │   └── get-worker.use-case.ts
│       ├── loan/
│       │   ├── create-loan.use-case.ts ⭐ (Core)
│       │   └── get-loan.use-case.ts
│       └── webhook/
│           ├── process-escrow-event.use-case.ts
│           └── process-lendi-proof-event.use-case.ts
│
├── infrastructure/      # Implementations
│   ├── blockchain/
│   │   ├── lendi-proof.client.ts
│   │   ├── lendi-proof-gate.client.ts
│   │   ├── reineira-sdk.client.ts
│   │   └── fhe-decryption.service.ts
│   ├── repository/
│   │   ├── worker.repository.memory.ts
│   │   └── worker.repository.postgres.ts
│   ├── auth/
│   │   ├── jwt.service.ts
│   │   ├── nonce.service.ts
│   │   └── siwe-verifier.ts
│   └── container.ts     # Dependency Injection
│
└── interface/           # API Layer
    ├── handler-factory.ts
    ├── middleware/
    │   ├── with-auth.ts
    │   └── with-cors.ts
    └── response.ts

api/                     # Vercel Functions
└── v1/
    ├── auth/
    │   └── wallet/
    │       ├── nonce.ts
    │       └── verify.ts
    ├── workers/
    │   ├── index.ts
    │   └── [id].ts
    ├── loans/
    │   ├── index.ts
    │   └── [id].ts
    └── webhooks/
        └── quicknode.ts
```

---

### Key Backend Services

#### 1. LendiProofClient (Blockchain)

**Location:** `src/infrastructure/blockchain/lendi-proof.client.ts`

**Responsibility:** Interact with the LendiProof contract

**Methods:**

```typescript
class LendiProofClient {
  // Read functions
  async isWorkerRegistered(address: Address): Promise<boolean>
  async isLenderRegistered(address: Address): Promise<boolean>
  async getEscrowWorker(escrowId: bigint): Promise<Address>
  async getEscrowThreshold(escrowId: bigint): Promise<bigint>
  async getLastResetTimestamp(worker: Address): Promise<bigint>

  // Write functions (require signer)
  async registerLender(signer: PrivateKeyAccount): Promise<Hash>
  async linkEscrow(
    escrowId: bigint,
    worker: Address,
    threshold: bigint
  ): Promise<Hash>
}
```

**Configuration:**

```typescript
const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(config.rpcUrl),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(config.signerPrivateKey),
  chain: arbitrumSepolia,
  transport: http(config.rpcUrl),
});
```

---

#### 2. LendiProofGateClient (FHE Verification)

**Location:** `src/infrastructure/blockchain/lendi-proof-gate.client.ts`

**Responsibility:** Manage the 3-step FHE verification flow

**Methods:**

```typescript
class LendiProofGateClient {
  // Step 1: Request verification
  async requestVerification(escrowId: bigint): Promise<Hash>

  // Step 2: Publish decrypted result
  async publishVerification(
    escrowId: bigint,
    result: boolean,
    signature: Hex
  ): Promise<Hash>

  // Step 3: Check if condition met
  async isConditionMet(escrowId: bigint): Promise<boolean>

  // Helper: Get encrypted handle
  async getEncryptedHandle(escrowId: bigint): Promise<Hex>
}
```

**Typical Flow:**

```typescript
// 1. Backend calls requestVerification after creating escrow
const txHash = await gateClient.requestVerification(escrowId);

// 2. Backend gets encrypted handle
const handle = await gateClient.getEncryptedHandle(escrowId);

// 3. Backend decrypts with @cofhe/sdk (off-chain)
const { plaintext, signature } = await cofhe.decryptForTx(handle);

// 4. Backend publishes result on-chain
await gateClient.publishVerification(escrowId, plaintext, signature);

// 5. Anyone can verify
const isMet = await gateClient.isConditionMet(escrowId); // true/false
```

---

#### 3. FHEDecryptionService (@cofhe/sdk)

**Location:** `src/infrastructure/blockchain/fhe-decryption.service.ts`

**Responsibility:** Decrypt FHE values off-chain

**Integration:**

```typescript
import { CofheClient } from '@cofhe/sdk';

class FHEDecryptionService {
  private cofheClient: CofheClient | null = null;

  async ensureInitialized() {
    if (!this.cofheClient) {
      this.cofheClient = await CofheClient.create({
        network: 'arbitrum-sepolia',
        rpcUrl: config.rpcUrl,
        privateKey: config.signerPrivateKey,
      });
    }
  }

  async decryptAndPublish(escrowId: bigint): Promise<boolean> {
    await this.ensureInitialized();

    // 1. Get encrypted handle from gate
    const handle = await this.gateClient.getEncryptedHandle(escrowId);

    // 2. Decrypt off-chain
    const { plaintext, signature } = await this.cofheClient!.decryptForTx(
      handle
    );

    // 3. Publish result on-chain
    await this.gateClient.publishVerification(
      escrowId,
      plaintext,
      signature
    );

    return plaintext;
  }
}
```

**Key Points:**
- Decryption happens **OFF-CHAIN** (no gas costs for decrypt)
- Backend signs the result with its private key
- Contract verifies signature before accepting result
- Process typically takes 10-30 seconds

---

#### 4. ReinieraSDKClient (Escrow Creation)

**Location:** `src/infrastructure/blockchain/reineira-sdk.client.ts`

**Responsibility:** Create escrows using ReinieraOS SDK

**Integration:**

```typescript
import { ReineiraSDK } from '@reiniera-os/sdk';

class ReinieraSDKClient {
  private sdk: ReineiraSDK | null = null;

  async ensureInitialized() {
    if (!this.sdk) {
      this.sdk = await ReineiraSDK.create({
        network: 'arbitrum-sepolia',
        privateKey: config.signerPrivateKey,
        rpcUrl: config.rpcUrl,
      });
    }
  }

  // Encode condition data (worker address + threshold)
  encodeConditionData(worker: Address, threshold: bigint): Hex {
    return encodeAbiParameters(
      [
        { type: 'address', name: 'worker' },
        { type: 'uint64', name: 'threshold' }
      ],
      [worker, threshold]
    );
  }

  async createLoanEscrow(params: {
    loanAmountUsdc: bigint;
    owner: Address;
    beneficiary: Address;
    worker: Address;
    thresholdUsdc: bigint;
  }): Promise<{ escrowId: bigint; txHash: Hash }> {
    await this.ensureInitialized();

    const conditionData = this.encodeConditionData(
      params.worker,
      params.thresholdUsdc
    );

    const result = await this.sdk!.escrow.create({
      amount: params.loanAmountUsdc,
      token: config.confidentialUsdcAddress, // ConfidentialUSDC
      owner: params.owner, // Lender
      beneficiary: params.beneficiary, // Worker or designated address
      resolver: config.lendiProofGateAddress, // LendiProofGate
      resolverData: conditionData, // Encoded: (worker, threshold)
    });

    return {
      escrowId: result.escrowId,
      txHash: result.txHash,
    };
  }
}
```

**Automation:**
When ReinieraOS creates the escrow:
1. Calls `LendiProofGate.onConditionSet(escrowId, conditionData)`
2. Gate decodes `(worker, threshold)` from `conditionData`
3. Gate calls `LendiProof.linkEscrow(escrowId, worker, threshold)`
4. Escrow is automatically linked to worker

---

### Main Use Case: CreateLoanUseCase

**Location:** `src/application/use-case/loan/create-loan.use-case.ts`

**Complete Flow:**

```typescript
class CreateLoanUseCase {
  async execute(dto: CreateLoanDTO): Promise<Loan> {
    // 1. Validate worker is registered on-chain
    const isRegistered = await this.lendiProofClient.isWorkerRegistered(
      dto.workerAddress
    );
    if (!isRegistered) {
      throw new Error('Worker not registered on-chain');
    }

    // 2. Create escrow via ReinieraOS SDK
    const { escrowId, txHash } = await this.reineiraClient.createLoanEscrow({
      loanAmountUsdc: BigInt(dto.loanAmountUsdc * 1_000_000), // Convert to 6 decimals
      owner: dto.lenderAddress || BACKEND_SIGNER_ADDRESS,
      beneficiary: dto.beneficiary,
      worker: dto.workerAddress,
      thresholdUsdc: BigInt(dto.thresholdUsdc * 1_000_000),
    });

    // 3. linkEscrow happens automatically via onConditionSet hook
    logger.info('Escrow linked automatically by gate', { escrowId });

    // 4. Request FHE verification
    await this.gateClient.requestVerification(escrowId);

    // 5. Trigger decrypt + publish (async, non-blocking)
    this.fheService.decryptAndPublish(escrowId).catch(error => {
      logger.error('FHE decryption failed', { escrowId, error });
    });

    // 6. Create loan in database
    const loan = await this.loanRepository.create({
      id: generateUUID(),
      workerId: dto.workerId,
      lenderId: dto.lenderId,
      escrowId: escrowId.toString(),
      status: LoanStatus.VERIFICATION_PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return loan;
  }
}
```

**Loan States:**

```typescript
enum LoanStatus {
  VERIFICATION_PENDING = 'verification_pending', // Waiting for FHE decryption
  APPROVED = 'approved',                        // income >= threshold
  REJECTED = 'rejected',                        // income < threshold
  SETTLED = 'settled',                          // Funds released
  CANCELLED = 'cancelled',                      // Cancelled by lender
}
```

---

## 👤 Complete User Flow

### Use Case: Worker Requests a Loan

#### Characters

- **Maria**: Informal worker, sells food on the street, earns ~$1200 USD/month
- **Juan**: Lender, has capital to lend
- **Lendi Backend**: Coordinates the process
- **Smart Contracts**: Guarantee privacy and execution

---

### Step 1: Maria Registers as Worker

**Frontend (React):**

```typescript
// Maria connects her wallet (MetaMask)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const mariaAddress = await signer.getAddress();

// Maria registers on blockchain
const lendiProof = new ethers.Contract(
  LENDI_PROOF_ADDRESS,
  LENDI_PROOF_ABI,
  signer
);

const tx = await lendiProof.registerWorker();
await tx.wait();
```

**On-Chain:**

```solidity
// LendiProof.sol
function registerWorker() external {
    registeredWorkers[msg.sender] = true;
    lastResetTimestamp[msg.sender] = block.timestamp;
    emit WorkerRegistered(msg.sender);
}
```

**Result:**
- ✅ Maria is registered on-chain
- ✅ Event `WorkerRegistered(mariaAddress)` emitted
- ✅ `lastResetTimestamp` initialized (prevents immediate reset)

---

### Step 2: Maria Records Her Income (Encrypted)

**Each time Maria receives payment:**

```typescript
import { CofheClient, Encryptable } from '@cofhe/sdk';

// Initialize FHE client
const cofhe = await CofheClient.create({
  network: 'arbitrum-sepolia',
  signer,
});

// Maria earned $300 today
const incomeToday = 300; // USD

// Convert to USDC (6 decimals)
const amountWithDecimals = ethers.parseUnits(incomeToday.toString(), 6);

// Encrypt with FHE
const [encryptedAmount] = await cofhe.encrypt([
  Encryptable.uint64(amountWithDecimals),
]);

// Record on-chain (ENCRYPTED)
const tx = await lendiProof.recordIncome(encryptedAmount);
await tx.wait();
```

**On-Chain:**

```solidity
// LendiProof.sol
function recordIncome(InEuint64 calldata encryptedAmount)
    external
    onlyWorker
{
    // Convert input to euint64
    euint64 amount = FHE.asEuint64(encryptedAmount);

    // Homomorphic addition (encrypted + encrypted = encrypted)
    monthlyIncome[msg.sender] = FHE.add(monthlyIncome[msg.sender], amount);

    // Grant permissions (CRITICAL for ACL)
    FHE.allowThis(monthlyIncome[msg.sender]);        // Contract can read
    FHE.allow(monthlyIncome[msg.sender], msg.sender); // Worker can decrypt

    // Increment transaction count (also encrypted)
    txCount[msg.sender] = FHE.add(txCount[msg.sender], FHE.asEuint64(1));
    FHE.allowThis(txCount[msg.sender]);

    emit IncomeRecorded(msg.sender, block.timestamp);
}
```

**Result:**
- ✅ Maria's income saved as `euint64` (encrypted)
- ✅ **NOBODY can see the amount** (not even Maria after recording)
- ✅ Can only be used for FHE comparisons (income >= threshold)
- ✅ Event `IncomeRecorded(mariaAddress, timestamp)` - **NO AMOUNT**

**Privacy:** The event only emits timestamp, NOT the amount. Backend only stores timestamp.

---

### Step 3: Maria Requests a Loan

**Frontend:**

```typescript
// Maria authenticates with SIWE
const nonce = await requestNonce(mariaAddress);
const { message, signature } = await signSiweMessage(mariaAddress, nonce, signer);
const { accessToken } = await verifyWallet(mariaAddress, message, signature);

// Maria requests $500 loan
// Requirement: Must have at least $800/month income
const loanRequest = {
  worker_address: mariaAddress,
  beneficiary: mariaAddress,
  loan_amount_usdc: 500,   // Amount to borrow
  threshold_usdc: 800,      // Minimum income required
};

const response = await fetch('https://lendi-origins.vercel.app/api/v1/loans', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(loanRequest),
});

const loan = await response.json();
// {
//   id: "loan_abc123",
//   escrow_id: "12345",
//   status: "verification_pending",
//   created_at: "2026-04-15T..."
// }
```

**Backend - CreateLoanUseCase:**

```typescript
// 1. Verify Maria is registered on-chain
const isRegistered = await lendiProofClient.isWorkerRegistered(mariaAddress);
// → true

// 2. Create escrow in ReinieraOS
const { escrowId, txHash } = await reineiraClient.createLoanEscrow({
  loanAmountUsdc: 500_000_000n, // $500 with 6 decimals
  owner: LENDER_ADDRESS,
  beneficiary: mariaAddress,
  worker: mariaAddress,
  thresholdUsdc: 800_000_000n, // $800 threshold
});
// → escrowId: 12345

// 3. Escrow is linked automatically (onConditionSet hook)
// ReinieraOS calls: gate.onConditionSet(12345, encode(mariaAddress, 800))
// Gate calls: lendiProof.linkEscrow(12345, mariaAddress, 800)

// 4. Request FHE verification
await gateClient.requestVerification(escrowId);

// 5. Trigger decrypt + publish (async)
fheService.decryptAndPublish(escrowId);

// 6. Save loan in DB
const loan = await loanRepository.create({
  escrowId: '12345',
  status: 'verification_pending',
  ...
});
```

**On-Chain - Escrow Creation:**

```solidity
// ReinieraOS: ConfidentialEscrow.sol
function createEscrow(
    uint256 amount,          // 500 USDC
    address beneficiary,     // mariaAddress
    address resolver,        // LendiProofGate
    bytes calldata data      // encode(mariaAddress, 800)
) external returns (uint256 escrowId) {
    // Create escrow
    escrowId = nextEscrowId++;
    escrows[escrowId] = Escrow({
        amount: amount,
        owner: msg.sender,
        beneficiary: beneficiary,
        resolver: resolver,
        status: EscrowStatus.PENDING
    });

    // Call hook on resolver
    IConditionResolver(resolver).onConditionSet(escrowId, data);

    emit EscrowCreated(escrowId, amount, beneficiary);
}
```

**On-Chain - Gate Hook:**

```solidity
// LendiProofGate.sol
function onConditionSet(
    uint256 escrowId,
    bytes calldata conditionData
) external override onlyEscrowContract {
    // Decode condition data
    (address worker, uint64 threshold) = abi.decode(
        conditionData,
        (address, uint64)
    );

    // Link escrow in LendiProof
    lendiProof.linkEscrow(escrowId, worker, threshold);

    emit ConditionSet(escrowId, worker, threshold);
}
```

**On-Chain - Escrow Linking:**

```solidity
// LendiProof.sol
function linkEscrow(
    bytes32 escrowId,
    address worker,
    uint64 threshold
) external onlyLender {
    escrowToWorker[escrowId] = worker;
    escrowToThreshold[escrowId] = threshold;

    emit EscrowLinked(escrowId, worker);
}
```

**Result:**
- ✅ Escrow created with $500 USDC
- ✅ Escrow linked to Maria
- ✅ Threshold: $800 (Maria must have >= $800/month)
- ✅ Loan saved in backend with status `verification_pending`

---

### Step 4: FHE Verification (3-Step Flow)

**Backend executes automatically:**

#### Step 1: Request Verification

```typescript
// Backend: FHEService.decryptAndPublish()

// 1. Request verification
await gateClient.requestVerification(escrowId);
```

**On-Chain:**

```solidity
// LendiProofGate.sol
function requestVerification(uint256 escrowId)
    external
    returns (bytes32 handle)
{
    address worker = lendiProof.escrowToWorker(escrowId);
    uint64 threshold = lendiProof.escrowToThreshold(escrowId);

    // Call LendiProof.proveIncome()
    ebool encryptedResult = lendiProof.proveIncome(worker, threshold);

    // Store encrypted handle
    verificationHandles[escrowId] = FHE.sealoutput(encryptedResult);

    emit VerificationRequested(escrowId, worker, threshold);

    return verificationHandles[escrowId];
}
```

**On-Chain - Prove Income (FHE Magic):**

```solidity
// LendiProof.sol
function proveIncome(address worker, uint64 threshold)
    external
    returns (ebool)
{
    // Homomorphic comparison: income >= threshold
    // This happens ENCRYPTED - nobody sees the values!
    ebool result = FHE.gte(
        monthlyIncome[worker],    // euint64 encrypted
        FHE.asEuint64(threshold)  // Convert threshold to euint64
    );

    // Grant permissions to decrypt result
    FHE.allow(result, msg.sender);  // Gate can decrypt
    FHE.allow(result, worker);      // Worker can decrypt

    emit ProofRequested(msg.sender, worker);

    return result; // ebool (encrypted boolean)
}
```

**Key FHE Concept:**

Maria has $1200/month recorded (encrypted):
```
monthlyIncome[maria] = euint64(1200000000) // encrypted
threshold = 800000000                       // plaintext

FHE.gte(euint64(1200000000), 800000000) = ebool(true) // encrypted
```

The result is an `ebool` (encrypted boolean). **NOBODY** can see that Maria has $1200, only that `income >= 800` is `true`.

---

#### Step 2: Decrypt Off-Chain

```typescript
// Backend: FHEService.decryptAndPublish()

// 2. Get encrypted handle
const handle = await gateClient.getEncryptedHandle(escrowId);

// 3. Decrypt using @cofhe/sdk (OFF-CHAIN, no gas)
const { plaintext, signature } = await cofhe.decryptForTx(handle);
// plaintext = true (Maria has >= $800)
// signature = cryptographic signature from backend
```

**Off-Chain Process:**
- Backend has permission to decrypt (via `FHE.allow()`)
- Decryption happens in backend server (no gas fees)
- Backend signs the result with its private key
- Takes ~5-15 seconds

---

#### Step 3: Publish Result On-Chain

```typescript
// Backend: FHEService.decryptAndPublish()

// 4. Publish result on-chain
await gateClient.publishVerification(escrowId, plaintext, signature);
```

**On-Chain:**

```solidity
// LendiProofGate.sol
function publishVerification(
    uint256 escrowId,
    bool result,
    bytes calldata signature
) external onlyBackend {
    // Verify signature (only backend can publish)
    require(verifySignature(escrowId, result, signature), "Invalid signature");

    // Store result
    verificationResults[escrowId] = result;
    conditionsMet[escrowId] = result;

    emit VerificationPublished(escrowId, result);
}
```

**Result:**
- ✅ Result published on-chain: `true` (Maria qualifies)
- ✅ `conditionsMet[12345] = true`
- ✅ **NOBODY knows how much Maria earns** (only that she qualifies)

---

### Step 5: Release Funds (Settle Escrow)

**Frontend or Backend:**

```typescript
// Verify condition is met
const isMet = await gateClient.isConditionMet(escrowId);
// → true

if (isMet) {
  // Settle escrow via ReinieraOS
  const escrowContract = new ethers.Contract(
    ESCROW_ADDRESS,
    ESCROW_ABI,
    signer
  );

  const tx = await escrowContract.settle(escrowId);
  await tx.wait();
}
```

**On-Chain:**

```solidity
// ReinieraOS: ConfidentialEscrow.sol
function settle(uint256 escrowId) external {
    Escrow storage escrow = escrows[escrowId];

    // Check condition with resolver
    require(
        IConditionResolver(escrow.resolver).isConditionMet(escrowId),
        "Condition not met"
    );

    // Transfer funds to beneficiary
    IERC20(confidentialUSDC).transfer(escrow.beneficiary, escrow.amount);

    escrow.status = EscrowStatus.SETTLED;

    emit EscrowSettled(escrowId);
}
```

**Result:**
- ✅ $500 USDC transferred to Maria
- ✅ Escrow marked as `SETTLED`
- ✅ Loan in backend updated to status `settled`

---

## 🔒 Privacy and FHE in Detail

### What is FHE (Fully Homomorphic Encryption)?

**Simple Definition:**
Allows performing operations on encrypted data WITHOUT decrypting them.

**Example:**

```javascript
// Without FHE (traditional)
income = 1200        // Plaintext - everyone can see
threshold = 800
result = income >= threshold // true - everyone can see

// With FHE (Lendi)
income = euint64(1200)        // ENCRYPTED - nobody can see
threshold = 800
result = FHE.gte(income, 800) // ebool(true) - ENCRYPTED - nobody can see
```

### Privacy Moat Principles

Lendi's FHE architecture protects two distinct data surfaces: **borrower data** (income, payment events, loan amounts) and **Lendi's competitive moat data** (loss book, eligibility curves, borrower concentration, recovery rates). Every byte of moat data that leaks on-chain is a byte a competitor can index for free.

#### Three-Rule Operating Principle

Following the privacy moat architecture (lendi-privacy-moat.md):

1. **Lendi moat contracts only interact with other Lendi contracts** - No external calls from moat state contracts
2. **All moat state is encrypted** - `euint*`, `ebool`, `eaddress`, `ebytes32` for competitive data
3. **No on-chain path from encrypted to plaintext** - Ever. Not for admins, not for analytics, not for debugging

Violate any of the three and the moat leaks.

#### Key Privacy Moat Findings (Future Implementation)

**P1 — Loss History as Encrypted Append-Only Log (Critical)**
- Every default, recovery, cure-to-current transition writes to dedicated `LendiLossHistory` contract
- `LossRecord` struct: encrypted principal, recovered amount, borrower ID, public timestamp/curve version
- Phase 1: Encrypted append-only log + `onlyLendiContract` gating
- Phase 2: In-FHE aggregation primitives for curve recalibration
- Prevents competitors from reconstructing loss book and borrower default history

**P2 — Borrower Concentration Registry (Critical)**
- `BorrowerExposureRegistry` holds per-borrower outstanding principal as `euint64`
- Encrypted borrower identity (`ebytes32`) prevents correlation attacks
- Handle-level access control: callers get boolean ("within cap: yes/no"), never raw exposure
- Breaks chain of linking borrowers across pools

**P3 — Eligibility Curve is IP (High)**
- Tuned curve stored as encrypted `euint32` arrays (income thresholds, principal multipliers)
- Policy underwriter configures curves via meta-tx with client-encrypted inputs
- `CreditMathLib.bucketize()` does FHE bucketing via chained `FHE.select`
- Prevents competitors from copying calibrated underwriting curves in one RPC call

**P5 — Strict FHE.allow Allowlists (Critical)**
- Every `FHE.allow` call must map to documented data classification
- Long-lived values: `FHE.allowThis` on owning contract only
- Cross-contract: `FHE.allow(value, otherContract)` - never to user EOAs for aggregate data
- Short-lived computation: `FHE.allowTransient(value, target)` expires end of tx
- Prevents permission drift over time

**P7 — Decrypt Ceremonies Off-Chain Only (High)**
- No on-chain `FHE.decrypt` path for moat state
- Underwriter-signed unseal via Fhenix off-chain ceremony
- Only aggregates: `totalLoansOriginatedQ1`, `activeBorrowerCount`, never `incomePerBorrower`
- k-anonymity thresholds (≥50 records) + differential privacy noise for repeat publications
- Protects borrowers from becoming predatory-lending targets via deanonymization

**P8 — Adapters are Weakest Link (High)**
- Privara payment attestation → `euint64` income delta in one stack frame
- No plaintext amount in storage, events, or cross-contract calls
- Stateless verification, opaque nonces only
- Prevents leakage at integration boundaries

**Current Status:** Privacy moat contracts (P1-P9) not yet implemented. Scheduled for Wave 3 after core functionality validation.

Reference: lendi-privacy-moat.md for complete privacy architecture

### FHE Operations in LendiProof

#### 1. Addition (FHE.add)

```solidity
// Maria earns $300, $400, $500 on different days
euint64 income1 = FHE.asEuint64(encrypt(300));
euint64 income2 = FHE.asEuint64(encrypt(400));
euint64 income3 = FHE.asEuint64(encrypt(500));

// Homomorphic addition
euint64 total = FHE.add(income1, income2); // encrypted(700)
total = FHE.add(total, income3);            // encrypted(1200)

// NOBODY can see it's 1200, but the value is stored encrypted
```

#### 2. Comparison (FHE.gte)

```solidity
// Verify if income >= threshold
euint64 monthlyIncome = euint64(1200); // encrypted
uint64 threshold = 800;                 // plaintext

ebool result = FHE.gte(monthlyIncome, FHE.asEuint64(threshold));
// result = ebool(true) - encrypted boolean
```

#### 3. Access Control List (ACL)

```solidity
// After each FHE operation, update permissions

// 1. Contract must be able to read its own storage
FHE.allowThis(monthlyIncome);

// 2. Worker should be able to decrypt their own income (if needed)
FHE.allow(monthlyIncome, workerAddress);

// 3. Gate must be able to decrypt verification result
FHE.allow(result, gateAddress);
```

**Golden Rule:**
> "Without FHE.allow() = passing a locked box without the key!"

Each new encrypted value needs explicit permissions.

---

### Privacy Guarantees

#### ✅ What NOBODY can see:

1. **Income amounts** of workers
   - Stored as `euint64` on-chain
   - Only the worker can decrypt (if we give permission)
   - Not backend, not lenders, not other workers

2. **Loan amounts** in escrow
   - ReinieraOS uses ConfidentialUSDC
   - Amounts encrypted

3. **Comparison results** (before publishing)
   - `ebool` encrypted
   - Only backend (with permission) can decrypt

#### ✅ What IS public:

1. **Addresses** of workers/lenders
2. **Timestamps** of events (NO amounts)
3. **Escrow IDs**
4. **Loan status** (pending, approved, rejected)
5. **Final result** of verification (true/false) - but NOT the income amount

#### ❌ What backend NEVER stores:

```typescript
// ❌ FORBIDDEN in database
interface ForbiddenData {
  income_amount: number;      // NEVER
  loan_amount: number;        // NEVER
  decrypted_value: any;       // NEVER
}

// ✅ ALLOWED in database
interface AllowedData {
  worker_address: string;     // OK
  income_timestamp: Date;     // OK (NO amount)
  tx_hash: string;           // OK
  escrow_id: string;         // OK
  loan_status: LoanStatus;   // OK
}
```

---

## 🔄 ReinieraOS Integration

### What is ReinieraOS?

**Definition:**
Escrow protocol with programmable confidential conditions.

**Components:**

1. **ConfidentialEscrow**: Main escrow contract
2. **IConditionResolver**: Interface for custom resolvers
3. **ConfidentialUSDC**: USDC with FHE encryption

### How Lendi Uses ReinieraOS

```
┌──────────────┐
│    Lender    │
│  (has USDC)  │
└──────┬───────┘
       │
       │ 1. Create Escrow
       ▼
┌─────────────────────┐
│ ConfidentialEscrow  │◀─── ReinieraOS
│  (holds $500 USDC)  │
└──────┬──────────────┘
       │
       │ 2. onConditionSet()
       ▼
┌──────────────────┐
│ LendiProofGate   │◀─── Custom Resolver
│  (our contract)  │
└──────┬───────────┘
       │
       │ 3. linkEscrow()
       ▼
┌──────────────┐
│ LendiProof   │◀─── FHE Verification
│  (FHE data)  │
└──────────────┘
```

### Detailed Flow

#### 1. Backend Creates Escrow

```typescript
// Backend: ReinieraSDKClient
const result = await sdk.escrow.create({
  amount: 500_000_000n,                      // $500 USDC (6 decimals)
  token: config.confidentialUsdcAddress,      // ConfidentialUSDC
  owner: lenderAddress,                       // Who owns the escrow
  beneficiary: workerAddress,                 // Who receives if approved
  resolver: config.lendiProofGateAddress,     // LendiProofGate
  resolverData: encode(workerAddress, 800),   // (worker, threshold)
});
```

#### 2. ReinieraOS Calls Hook

```solidity
// ConfidentialEscrow.sol (ReinieraOS)
function createEscrow(...) external returns (uint256 escrowId) {
    // Create escrow...

    // Call custom resolver hook
    IConditionResolver(resolver).onConditionSet(escrowId, resolverData);

    // ...
}
```

#### 3. Gate Processes Hook

```solidity
// LendiProofGate.sol (Lendi)
function onConditionSet(
    uint256 escrowId,
    bytes calldata conditionData
) external override onlyEscrowContract {
    // Decode data
    (address worker, uint64 threshold) = abi.decode(
        conditionData,
        (address, uint64)
    );

    // Link in LendiProof (backend signer is registered lender)
    lendiProof.linkEscrow(escrowId, worker, threshold);
}
```

**Key Benefit:**
Backend does NOT need to call `linkEscrow()` manually - happens automatically when escrow is created.

#### 4. Verify Condition

```solidity
// ConfidentialEscrow.sol
function settle(uint256 escrowId) external {
    // Ask resolver if condition is met
    bool isMet = IConditionResolver(escrow.resolver).isConditionMet(escrowId);

    if (isMet) {
        // Transfer funds
        IERC20(confidentialUSDC).transfer(escrow.beneficiary, escrow.amount);
    }
}
```

```solidity
// LendiProofGate.sol
function isConditionMet(uint256 escrowId)
    external
    view
    returns (bool)
{
    return conditionsMet[escrowId]; // Set by publishVerification()
}
```

---

## 📊 Use Cases

### Case 1: Simple Loan Approved

```
Worker: Ana
Income: $1500/month (recorded encrypted)
Loan Request: $800
Threshold: $1000

Flow:
1. Ana records income: $500 + $500 + $500 = $1500 (encrypted)
2. Ana requests $800 with threshold $1000
3. Backend creates escrow
4. FHE verifies: $1500 >= $1000 → true
5. Escrow is released
6. Ana receives $800

Result: ✅ APPROVED
Privacy: Nobody knows Ana earns $1500, only that she qualifies
```

### Case 2: Loan Rejected

```
Worker: Carlos
Income: $700/month (recorded encrypted)
Loan Request: $500
Threshold: $1000

Flow:
1. Carlos records income: $300 + $400 = $700 (encrypted)
2. Carlos requests $500 with threshold $1000
3. Backend creates escrow
4. FHE verifies: $700 >= $1000 → false
5. Escrow is NOT released
6. Funds return to lender

Result: ❌ REJECTED
Privacy: Nobody knows Carlos earns $700, only that he doesn't qualify
```

### Case 3: Worker with Variable Income

```
Worker: Maria
Income Month 1: $400 + $500 + $300 = $1200
Income Month 2: $200 + $300 = $500 (after reset)

Flow:
1. Maria records income in Month 1 → $1200 (encrypted)
2. Maria requests loan → threshold $800 → APPROVED
3. 30 days pass
4. Maria calls resetMonthlyIncome() → income = 0
5. Maria records new income in Month 2 → $500
6. Maria requests new loan → threshold $800 → REJECTED

Result: System allows monthly cycles
Privacy: Amounts never revealed
```

---

## 🔀 Sequence Diagrams

### Diagram 1: Worker Registration

```
Worker                 Frontend                LendiProof
  |                       |                         |
  |  Connect Wallet       |                         |
  |---------------------->|                         |
  |                       |                         |
  |                       |  registerWorker()       |
  |                       |------------------------>|
  |                       |                         |
  |                       |      (tx confirm)       |
  |                       |<------------------------|
  |                       |                         |
  |                       |  Event: WorkerRegistered|
  |                       |<------------------------|
  |                       |                         |
  |   Confirmation        |                         |
  |<----------------------|                         |
```

### Diagram 2: Income Recording

```
Worker     Frontend      @cofhe/sdk    LendiProof
  |            |              |             |
  | Input $300 |              |             |
  |----------->|              |             |
  |            |              |             |
  |            | encrypt(300) |             |
  |            |------------->|             |
  |            |              |             |
  |            | encrypted    |             |
  |            |<-------------|             |
  |            |              |             |
  |            | recordIncome(encrypted)    |
  |            |--------------------------->|
  |            |              |             |
  |            |              | FHE.add()   |
  |            |              | FHE.allowThis()
  |            |              |             |
  |            | tx confirmed |             |
  |            |<----------------------------|
  |            |              |             |
  |            | Event: IncomeRecorded      |
  |            | (timestamp only, NO amount)|
  |            |<----------------------------|
```

### Diagram 3: Loan Creation (Complete)

```
Worker  Frontend  Backend    ReinieraSDK  Escrow    Gate      LendiProof  FHEService
  |        |         |            |          |         |           |           |
  | Request|         |            |          |         |           |           |
  | Loan   |         |            |          |         |           |           |
  |------->|         |            |          |         |           |           |
  |        |         |            |          |         |           |           |
  |        | POST    |            |          |         |           |           |
  |        | /loans  |            |          |         |           |           |
  |        |-------->|            |          |         |           |           |
  |        |         |            |          |         |           |           |
  |        |         | createEscrow          |         |           |           |
  |        |         |----------->|          |         |           |           |
  |        |         |            |          |         |           |           |
  |        |         |            | create() |         |           |           |
  |        |         |            |--------->|         |           |           |
  |        |         |            |          |         |           |           |
  |        |         |            |          | onConditionSet      |           |
  |        |         |            |          |-------->|           |           |
  |        |         |            |          |         |           |           |
  |        |         |            |          |         | linkEscrow|           |
  |        |         |            |          |         |---------->|           |
  |        |         |            |          |         |           |           |
  |        |         |            |          |         | ✅ Linked |           |
  |        |         |            |          |         |<----------|           |
  |        |         |            |          |         |           |           |
  |        |         | requestVerification   |         |           |           |
  |        |         |-------------------------------->|           |           |
  |        |         |            |          |         |           |           |
  |        |         |            |          |         | proveIncome           |
  |        |         |            |          |         |---------->|           |
  |        |         |            |          |         |           |           |
  |        |         |            |          |         |           | FHE.gte() |
  |        |         |            |          |         |           | (encrypted)
  |        |         |            |          |         |           |           |
  |        |         |            |          |         | ebool     |           |
  |        |         |            |          |         |<----------|           |
  |        |         |            |          |         |           |           |
  |        |         | decryptAndPublish     |         |           |           |
  |        |         |-------------------------------------------------->|     |
  |        |         |            |          |         |           |           |
  |        |         |            |          |         |           |      getHandle
  |        |         |            |          |         |           |      decrypt (off-chain)
  |        |         |            |          |         |           |      publishResult
  |        |         |            |          |         |           |           |
  |        |         |            |          |         | ✅ result=true        |
  |        |         |            |          |         |<----------------------|
  |        |         |            |          |         |           |           |
  |        | loan    |            |          |         |           |           |
  |        | created |            |          |         |           |           |
  |<-------|---------|            |          |         |           |           |
  |        |         |            |          |         |           |           |
  | Poll   |         |            |          |         |           |           |
  | status |         |            |          |         |           |           |
  |------->|         |            |          |         |           |           |
  |        |         |            |          |         |           |           |
  |        | GET /loans/:id       |          |         |           |           |
  |        |-------->|            |          |         |           |           |
  |        |         |            |          |         |           |           |
  |        | status: |            |          |         |           |           |
  |        | approved|            |          |         |           |           |
  |<-------|---------|            |          |         |           |           |
```

---

## 📈 Performance and Timings

### Expected Times (Arbitrum Sepolia)

```
Operation                        Time
─────────────────────────────────────────
Worker Registration (on-chain)   2-5s
Income Recording (on-chain)      3-7s
SIWE Authentication             <1s
Loan Creation (backend)          2-5s
Escrow Creation (ReinieraOS)     5-10s
FHE Verification Request         2-5s
FHE Decryption (off-chain)       5-15s
FHE Publish Result              2-5s
─────────────────────────────────────────
TOTAL Loan Flow                  25-60s
```

### Optimizations

- ✅ FHE decryption is **async** (non-blocking)
- ✅ Backend uses **memory DB** for testnet (fast reads)
- ✅ Viem 2.x with **connection pooling**
- ✅ Vercel **Edge Network** (low latency)

---

## 🔐 Security

### Smart Contracts

- ✅ **Ownable pattern** (only owner can call certain functions)
- ✅ **Modifier checks** (onlyWorker, onlyLender, onlyBackend)
- ✅ **FHE ACL** (control who can decrypt)
- ✅ **Time locks** (30-day reset period)
- ✅ **Event emissions** (auditability)

### Backend

- ✅ **SIWE authentication** (Sign-In with Ethereum)
- ✅ **JWT tokens** with expiration (1 hour access, 30 days refresh)
- ✅ **Input validation** (Zod schemas)
- ✅ **CORS configuration** (only allowed origins)
- ✅ **No secrets in logs**
- ✅ **Environment variable validation**

### Privacy

- ✅ **Zero amounts in database**
- ✅ **FHE encryption** for all financial data
- ✅ **No plaintext income** anywhere
- ✅ **Event emissions** without amounts
- ✅ **Off-chain decryption** (only authorized backend)

---

## 🌎 Regulatory & Business Context

**Status:** Evaluating multiple regulatory paths. No decision made yet.

**Source:** Regulatory analysis documented in lendi-positioning.md, lendi-pilot-plan.md, lendi-wallet-path.md.

### Business Path Options Under Evaluation

Based on regulatory stress testing analysis, Lendi could potentially operate under these paths:

#### Path A — B2B SaaS (Software Vendor to Licensed Lenders)
- **What Lendi is:** Delaware SaaS company selling FHE underwriting infrastructure to licensed LATAM lenders
- **Legal posture:** No financial services licensing anywhere; software vendor to regulated partners
- **First market:** Ecuador (cooperativa partnership via SEPS, LOEPS Article 133 mutual-aid pool)
- **Time to first loan:** 90 days
- **Year 1 cost:** ~$870k-1.78M
- **Revenue model:** SaaS fees ($500-30k/month) + per-decision fees + creator royalty on Reineira pools
- **Advantages:** Fastest to revenue, lowest regulatory burden, no credit-cycle exposure, highest fundraising multiple (10-20x ARR)
- **Trade-offs:** Thinner per-loan economics, B2B sales cycles, partner-dependent execution

#### Path B1 — SOFOM-ENR (Balance-Sheet Microlender in Mexico)
- **What Lendi is:** Licensed Mexican non-bank lender using own capital
- **Legal posture:** SOFOM-ENR registration (administrative, not substantive review), no retail investor protection rules
- **Time to first loan:** 3-6 months
- **Year 1 cost:** ~$950k-2.3M + lending capital
- **Revenue model:** Full interest margin on loan book
- **Advantages:** No mutual-aid pool regulatory conflict, full strategic control, simpler than IFC
- **Trade-offs:** Requires Lendi to raise lending capital, credit-cycle exposure, per-market licensing

#### Path B2 — SOFOM-ENR + Institutional LP Pool (Fund-Style Microlender)
- **What Lendi is:** Same as B1 but lending capital from institutional LPs (DFIs, impact funds)
- **Advantages:** Scalable capital without equity raises, Reineira DAO LP sourcing, management + performance fees
- **Trade-offs:** Fund setup adds 1-2 months, LP onboarding overhead, fund management discipline required

#### Path B3 — IFC (Retail P2P Platform in Mexico)
- **What Lendi is:** Licensed platform matching retail lenders with retail borrowers
- **Legal posture:** CNBV substantive authorization (9-18 months), retail investor protection rules, Ley Fintech Article 18 prohibits platform bearing credit risk
- **Time to first loan:** 14-18 months
- **Year 1 cost:** ~$1.75M-3.8M
- **Advantages:** Enables "anyone can lend" participation, largest potential market
- **Trade-offs:** Longest timeline, highest cost, mutual-aid pool requires workaround, dual regulatory surface (borrower + lender protection)

#### Path C — Non-Custodial Wallet Pivot (Regulatory Bypass)

**Note:** Shared as "This one can bypass regulators, but have way. Fyi"

- **Model:** Personal finance management tool (not a lending platform)
- **5 design constraints:** No loan product surface, no loan math, no loan state tracking, no loan-tied revenue, no loan-specific marketing
- **Advantages:** 30+ market operation with minimal licensing, no lending regulation
- **Trade-offs:** Complete architectural redesign required, no direct lending revenue, constrained product expression
- **Compatibility:** Incompatible with current Wave 2 implementation (lending-first architecture)

**Status:** Under evaluation. Would require abandoning current contracts and restarting with different architecture.

### Current Implementation vs. Path Options

**Wave 2 architecture was built with lending-first approach (Path A/B focus).** Alignment with each path option:

- **Path A (Ecuador B2B SaaS):** Current contracts are compatible. Would require white-labeling for cooperativa partners, backend multi-tenant support
- **Path B1/B2 (Mexico SOFOM-ENR):** SOFOM-ENR requires no mutual-aid pool workaround; current escrow model compatible; would need Mexican entity + lending capital
- **Path B3 (Mexico IFC P2P):** Would need mutual-aid pool legal structure (4 workarounds available); longest regulatory timeline (14-18 months)
- **Path C (Wallet):** Would require **significant product redesign** to eliminate loan-specific UX; not compatible with current contract architecture

**Our current implementation assumes direct lending model (Path A or B), not wallet model (Path C).**

### Legal Considerations for FHE Architecture

**Key regulatory insight:** FHE privacy protections are **non-negotiable** under all paths.

- **Path A (Ecuador):** LOEPS Article 133 mutual-aid pools are native legal construct; FHE privacy protects cooperativa member data
- **Path B1/B2 (Mexico SOFOM-ENR):** No conflict with mutual-aid pools (SOFOMs are credit-risk-bearing by design); consumer protection (PROFECO/CONDUSEF) requires transparent total-cost-of-credit disclosure, compatible with FHE income privacy
- **Path B3 (Mexico IFC):** Retail investor protection requires disclosures; borrower income privacy maintained via FHE while publishing aggregate risk metrics
- **All paths:** Privacy moat (P1-P9) protects competitive data; borrower privacy protects against predatory targeting

**Regulatory backdoor stance:** No on-chain decryption backdoor exists. Any off-chain decryption is bounded by P7 (k-anonymity, aggregate-only, ceremony-based with explicit signatures).

Reference: lendi-positioning.md, lendi-pilot-plan.md for complete regulatory analysis

---

## 🎯 Conclusion

### Complete System

Lendi combines:

1. **Smart Contracts** (Arbitrum Sepolia)
   - LendiProof (FHE storage)
   - LendiProofGate (condition resolver)
   - ReinieraOS (escrow management)

2. **Backend** (Vercel)
   - Clean Architecture
   - FHE decryption service
   - ReinieraOS SDK integration
   - SIWE authentication

3. **Frontend** (React)
   - Wallet connection
   - FHE encryption (@cofhe/sdk)
   - Loan request UI

### Key Benefits

- ✅ **Privacy-First**: Income amounts never revealed
- ✅ **Trustless**: Smart contracts guarantee execution
- ✅ **Accessible**: Informal workers can access credit
- ✅ **Secure**: FHE + blockchain security
- ✅ **Transparent**: Everything on-chain, auditable

### Current Status

- ✅ Contracts deployed on Arbitrum Sepolia
- ✅ Backend 100% functional on Vercel
- ✅ Automated tests at 100%
- ✅ Complete documentation
- ⏸️ Frontend in integration
- ⏸️ Critical findings (W1, W2, W3, W13) require fixes before production
- ⏸️ Privacy moat contracts (P1-P9) scheduled for Wave 3

---

## 💬 Questions for Privara/ReinieraOS Team

Based on the technical review (W1-W13 findings), privacy moat architecture (P1-P9), and regulatory analysis (Paths A/B/C) you shared, we have specific technical and strategic questions:

### Technical Architecture & Integration

1. **Privara Payment Attestation Integration (W1)**
   - What's the recommended adapter pattern for converting Privara attestations to FHE-encrypted income deltas?
   - Should we implement sector/country adjustment lookups (P4) inside the adapter or in a separate policy contract?
   - What replay protection mechanisms do Privara attestations include (nonces, timestamps, signature scopes)?

2. **Binary Search Attack Mitigation (W2)**
   - Is `onlyEscrowOwnerOrWorker` access control sufficient, or should we implement additional rate limiting at the gate level?
   - Would a commitment-reveal scheme for threshold values add meaningful security against this attack?
   - Should we consider adding noise to FHE comparisons to prevent threshold fishing?

3. **ReinieraOS Escrow Integration**
   - **Integration Status:** We've implemented `IConditionResolver` interface and deployed LendiProofGate, but haven't completed an end-to-end test with actual ReinieraOS escrow creation/settlement. Is there a ReinieraOS testnet environment we should be testing against?
   - **SDK Availability:** Our backend uses `@reiniera-os/sdk` but we're unclear if this is publicly available or in private beta. Can you share SDK documentation or examples for escrow creation with custom resolvers?
   - **onConditionSet Hook:** Our current implementation assumes ReinieraOS calls `onConditionSet(escrowId, conditionData)` when an escrow is created with our gate as resolver. Is this the correct flow, or do we need to register our resolver somewhere first?
   - **Condition Data Format:** We encode condition data as 20 bytes (address) + 8 bytes (uint64 threshold). Is this the recommended format, or should we use ABI encoding for better interoperability?
   - **Error Handling:** How does ReinieraOS handle cases where `isConditionMet()` reverts (e.g., our `VerificationNotReady` error)? Should we return `false` instead of reverting?
   - **Escrow Disputes:** How does ReinieraOS handle escrow cancellations or refunds? Should our `linkEscrow` support unlinking, or is this handled at the ReinieraOS level?

4. **FHE Performance & Optimization**
   - What are realistic decryption latencies for `ebool` results in production (vs. testnet)? How should we set user expectations?
   - Are there @cofhe/sdk batching APIs for decrypting multiple handles in one operation?
   - For P1 (encrypted loss history), what are the gas cost implications of in-FHE aggregation vs. off-chain decrypt-aggregate-re-encrypt?

### Privacy Moat Architecture

5. **Loss History & Curve Recalibration (P1)**
   - Phase 1 (encrypted append-only log) vs. Phase 2 (in-FHE aggregation): Is there a Fhenix library or reference implementation for encrypted aggregation primitives?
   - What ACL strategy should we use for `LendiLossHistory` reads by `CreditMathLib` during recalibration?
   - Should loss records be per-loan or per-pool to minimize correlation surfaces?

6. **Borrower Concentration Registry (P2)**
   - For encrypted borrower IDs (`ebytes32`), should we hash wallet addresses on-chain or require clients to submit pre-hashed identifiers?
   - How do we handle the "new borrower" case where `_exposure[borrowerId]` doesn't exist yet (FHE.add with uninitialized euint64)?
   - Should concentration caps be global, per-pool, or per-lender-per-pool?

7. **Eligibility Curve Storage (P3)**
   - Curve updates via meta-tx with client-encrypted inputs: Does this require ERC2771 forwarder integration, or can we use a simpler pattern?
   - For `CreditMathLib.bucketize` with chained `FHE.select`, what's the gas cost scaling (6 buckets vs. 10 buckets vs. dynamic)?
   - Should curves be versioned on-chain with migration logic, or can we use upgradeable storage slots?

8. **Decrypt Ceremonies & k-Anonymity (P7)**
   - What tools/libraries exist for k-anonymity enforcement and differential privacy noise calibration in the Fhenix ecosystem?
   - Should we implement ceremony signatures via multi-sig (Gnosis Safe) or via a custom governance contract?
   - For impact reporting (DFI/grant applications), what aggregate metrics are safe to publish without compromising individual borrower privacy?

### Business Path & Regulatory Guidance

9. **Path A (B2B SaaS Ecuador) — Immediate Pilot**
   - For Ecuador cooperativa partnerships, what's the typical integration timeline for Privara payment rail adapters?
   - Do Ecuadorian cooperativas have existing tech stacks we should integrate with (core banking systems, member portals)?
   - LOEPS Article 133 mutual-aid pools: Are there reference legal structures or existing cooperativas using similar models we should study?

10. **Strategic Path Selection — Guidance Needed**
    - **We have not decided which regulatory path to pursue.** The team shared 4+ options (Paths A, B1, B2, B3, C) with different trade-offs. Given our current Wave 2 implementation (lending-first architecture), which path would you recommend we prioritize?
    - **Path A (Ecuador B2B SaaS) seems like the fastest starting point** (90 days, ~$870k-1.78M year 1 cost, LOEPS Article 133 mutual-aid pools). Do you have cooperativa partners in Ecuador we could approach for pilot partnerships?
    - **Path C (Wallet) was shared as regulatory bypass** ("This one can bypass regulators, but have way. Fyi"). Would pursuing Path C require us to redesign our entire product architecture, or can we combine wallet + B2B SaaS (Path A + C)?
    - **Sequential approach:** Would it make sense to start with Path A Ecuador pilot (90 days, low cost) and use pilot data to decide between Path B1/B2 (direct lending) or Path C (wallet) at month 6-9?
    - Does Reineira DAO have institutional LP sourcing capacity for Path B2 (fund-style lending capital) if we go the SOFOM-ENR route?

### Next Steps & Collaboration

11. **Wave 2 → Wave 3 Transition**
    - Which critical findings (W1, W2, W3, W13) should be highest priority before we deploy frontend?
    - Should we deploy privacy moat contracts (P1-P9) incrementally (e.g., P5 allowlists + P8 adapter rules first) or as a complete suite?
    - Is there a Privara/Reineira technical partner or audit firm you recommend for contract security review?

12. **Privacy Moat Architecture & Reference Implementations**
    - Are there Privara adapter reference implementations for LATAM payment rails (Mexico, Colombia, Argentina) we can study? Specifically interested in how to handle sector/country adjustments (P4) and replay protection.
    - For privacy moat contracts (P1-P9), are there existing projects in the Reineira ecosystem implementing similar encrypted loss history or borrower concentration registries we could reference?
    - W11 finding mentions lack of upgradeability (no TestnetCoreBase). For production deployment, should we implement proxy pattern (TransparentUpgradeableProxy/UUPS) or migrate to Fhenix's TestnetCoreBase inheritance? What's the recommended approach for FHE contracts?

**Areas where we need guidance:**
1. **Technical Implementation:** W1-W13 fixes, ReinieraOS end-to-end integration, privacy moat (P1-P9) implementation strategy
2. **Strategic Path Selection:** Which regulatory path (A, B1, B2, B3, or C) is most viable given our current architecture
3. **Go-to-Market:** If Path A (Ecuador cooperativa) recommended, guidance on cooperativa partnership approach

---

**Version:** Wave 2
**Status:** Production Ready (Testnet) — Critical Fixes Required for Production
**Next:** Address W1/W2/W3/W13 → Frontend integration → Privacy moat (P1-P9) → Mainnet deployment (Wave 3)

---

**For more information:**

- Backend Integration: `packages/app/BACKEND_INTEGRATION.md`
- Test Results: `packages/backend/TEST_RESULTS.md`
- Backend Status: `packages/backend/BACKEND_STATUS.md`
- E2E Testing: `packages/backend/E2E_TESTING.md`
- Technical Review Reference: `lendi-review.md`
- Privacy Moat Reference: `lendi-privacy-moat.md`
- Regulatory Analysis: `lendi-positioning.md`
- Rollout Plans: `lendi-pilot-plan.md`
