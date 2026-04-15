# Lendi - Complete System Architecture

**Version:** Wave 2
**Network:** Arbitrum Sepolia (Testnet)
**Status:** Production Ready
**Date:** April 15, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Contract Architecture](#contract-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Complete User Flow](#complete-user-flow)
5. [Technical Data Flow](#technical-data-flow)
6. [Privacy and FHE](#privacy-and-fhe)
7. [ReinieraOS Integration](#reineraos-integration)
8. [Use Cases](#use-cases)
9. [Sequence Diagrams](#sequence-diagrams)

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
// Step 1: Request verification (anyone can call)
function requestVerification(uint256 escrowId)
    external
    returns (bytes32 handle)

// Step 2: Backend decrypts off-chain and publishes result
function publishVerification(
    uint256 escrowId,
    bool result,
    bytes calldata signature
) external onlyBackend

// Step 3: Check if condition met (anyone can read)
function isConditionMet(uint256 escrowId)
    external
    view
    returns (bool)
```

**Storage:**

```solidity
mapping(uint256 => bytes32) public verificationHandles;
mapping(uint256 => bool) public verificationResults;
mapping(uint256 => bool) public conditionsMet;
```

**ReinieraOS Hooks:**

```solidity
// Called automatically by ReinieraOS when escrow is created
function onConditionSet(
    uint256 escrowId,
    bytes calldata conditionData
) external override onlyEscrowContract {
    // Decode worker address + threshold from conditionData
    (address worker, uint64 threshold) = abi.decode(
        conditionData,
        (address, uint64)
    );

    // Link escrow to worker in LendiProof
    lendiProof.linkEscrow(escrowId, worker, threshold);

    emit ConditionSet(escrowId, worker, threshold);
}
```

**Key Feature:** The gate acts as a "private oracle" - obtains FHE result and publishes it verifiably.

---

#### 3. LendiPolicy (Pricing & Fees)

**Address:** `0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E`

**Purpose:** Calculate fees and manage dynamic pricing

**Functions:**

```solidity
function calculatePremium(
    uint256 loanAmount,
    uint256 threshold,
    uint256 duration
) external view returns (uint256 premium)

function getFeeRecipient() external view returns (address)
```

**Pricing Model (Wave 2):**
- Base fee: 1 USDC to register lender
- Escrow fees: Managed by ReinieraOS
- Premium: Calculated based on risk (loan_amount / threshold ratio)

---

### ReinieraOS Contracts

#### ConfidentialEscrow

**Address:** `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa`

**Purpose:** Escrow with confidential conditions

**Flow:**

```solidity
// Create escrow
function createEscrow(
    uint256 amount,
    address beneficiary,
    address conditionResolver,
    bytes calldata conditionData
) external returns (uint256 escrowId)

// Settle escrow (only if condition met)
function settle(uint256 escrowId) external
```

**Key Feature:** The escrow uses `conditionResolver` (LendiProofGate) to validate whether to release or not.

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

---

**Version:** Wave 2
**Status:** Production Ready (Testnet)
**Next:** Frontend integration & Mainnet deployment (Wave 3)

---

**For more information:**

- Backend Integration: `packages/app/BACKEND_INTEGRATION.md`
- Test Results: `packages/backend/TEST_RESULTS.md`
- Backend Status: `packages/backend/BACKEND_STATUS.md`
- E2E Testing: `packages/backend/E2E_TESTING.md`
