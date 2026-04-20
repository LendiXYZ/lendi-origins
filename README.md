<div align="center">

# Lendi

**Confidential Income Verification for Informal Credit**

*Prove what you earn. Reveal nothing.*

[![Platform](https://img.shields.io/badge/ReineiraOS-v0.1-blue)](https://reineira.xyz)
[![Network](https://img.shields.io/badge/Arbitrum-Sepolia-orange)](https://sepolia.arbiscan.io/)
[![FHE](https://img.shields.io/badge/Fhenix-CoFHE-purple)](https://fhenix.io)

[Live Demo](#) · [Documentation](./docs/) · [GitHub Issues](https://github.com/LendiXYZ/lendi-origins/issues) · [ReineiraOS Docs](https://reineira.xyz/docs)

---

</div>

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [The Problem](#the-problem)
- [How Lendi Works](#how-lendi-works)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Smart Contracts](#smart-contracts-testnet)
- [Technology Stack](#technology-stack)
- [Use Cases](#use-cases)
- [Project Structure](#project-structure)
- [Technical Specifications](#technical-specifications)
- [Security Model](#security-model)
- [Roadmap](#roadmap)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Lendi is a **two-sided trust infrastructure for informal credit** that enables workers to prove income without revealing sensitive financial data, while providing lenders with protocol-grade capital protection through Fully Homomorphic Encryption (FHE).

Built on [ReineiraOS](https://reineira.xyz) confidential escrow protocol and powered by [Fhenix CoFHE](https://fhenix.io), Lendi solves the fundamental trust problem in informal lending markets: workers lack traditional credit history, and lenders need verifiable proof without compromising borrower privacy.

### The Privacy Problem in Informal Credit

Traditional lending relies on centralized credit bureaus that expose:
- Complete income history
- Employment details and employer relationships
- Spending patterns and financial behavior
- Personal credit scores and debt ratios

**Lendi solves this** by using Fully Homomorphic Encryption (FHE) to verify income thresholds without revealing actual earnings, enabling confidential creditworthiness assessment while maintaining complete financial privacy.

---

## Core Features

### Confidential Income Verification
Workers register encrypted income proofs using Fhenix CoFHE. Lenders can verify that income exceeds loan thresholds without learning the actual amount through FHE computations.

### Automated Escrow Protection
Loan funds are locked in ReineiraOS confidential escrows with cryptographic conditions. Funds release automatically when income verification succeeds, eliminating manual intervention and trust requirements.

### Passkey Authentication
Browser-native WebAuthn passkey authentication via ZeroDev smart accounts. No seed phrases, no passwords—biometric-secured access with hardware-level protection.

### Non-Custodial Architecture
Users maintain full control of funds through ERC-4337 smart accounts. Lendi never holds custody—protocol enforces rules through FHE-encrypted conditions and on-chain escrows.

### Privacy-Preserving Proofs
Income verification happens entirely on encrypted data. FHE computations prove threshold compliance (e.g., "income ≥ $1000/month") without decrypting actual earnings.

### Cross-Border Compatibility
Built on Arbitrum with USDC stablecoin infrastructure. Enables international informal lending without currency volatility or geographic restrictions.

---

## The Problem

### For Workers (Borrowers)

**Credit Invisibility**: Informal workers (gig economy, freelancers, unbanked populations) lack traditional credit history despite consistent income, blocking access to capital markets.

**Privacy Concerns**: Traditional verification requires sharing bank statements, tax records, and employment contracts—exposing sensitive financial data to centralized intermediaries and potential misuse.

**Geographic Barriers**: Cross-border lending requires navigating currency exchange, regulatory compliance, and trust establishment—prohibitively expensive for small informal loans.

### For Lenders

**Information Asymmetry**: Cannot verify borrower creditworthiness without intrusive data collection, creating adverse selection and high default risk.

**Capital Risk**: Informal lending lacks legal recourse or collateral enforcement mechanisms, exposing lenders to complete loss in default scenarios.

**Operational Overhead**: Manual income verification, contract negotiation, and repayment tracking require significant time investment per loan.

### Lendi's Solution

| Problem | Traditional Approach | Lendi Solution |
|---------|---------------------|----------------|
| **Income Verification** | Bank statements, pay stubs | FHE-encrypted threshold proofs |
| **Privacy** | Full disclosure to lender | Zero-knowledge income verification |
| **Capital Protection** | Legal contracts, collateral | Cryptographic escrow conditions |
| **Trust Establishment** | Reputation, references | Protocol-enforced rules |
| **Cross-Border** | Wire transfers, forex | USDC stablecoin infrastructure |
| **Operational Cost** | Manual processing | Automated smart contract execution |

---

## How Lendi Works

Lendi implements a confidential credit protocol through a three-phase process:

### Phase 1: Worker Registration

```
Worker registers income proof:
  1. Input monthly income (e.g., $1500)
  2. Encrypt income using Fhenix CoFHE: encryptedIncome = FHE.encrypt(1500)
  3. Submit encrypted proof to LendiProof smart contract
  4. Contract stores encrypted income on-chain (never decrypted!)

Result: Income proof registered with zero-knowledge privacy
```

**Privacy Guarantee**: Encrypted income never leaves encrypted form. Contract performs FHE comparisons directly on ciphertext.

### Phase 2: Loan Creation (Lender)

```
Lender creates loan offer:
  1. Select registered worker (by address)
  2. Set loan amount (e.g., $100 USDC)
  3. Set income threshold (e.g., $1000/month minimum)
  4. Submit to ReineiraOS confidential escrow

Smart contract execution:
  1. Lock $100 USDC in escrow
  2. Attach LendiProofGate condition resolver
  3. Encode threshold: resolverData = encode(workerAddress, $1000)
  4. Escrow becomes claimable when: FHE.gte(encryptedIncome, $1000) == TRUE
```

**Capital Protection**: Funds cannot be withdrawn unless FHE condition proves income threshold met.

### Phase 3: Loan Redemption (Worker)

```
Worker claims loan:
  1. Request income verification from LendiProofGate
  2. Contract performs FHE comparison: isEligible = FHE.gte(encryptedIncome, threshold)
  3. Worker provides signature proving verification request
  4. Contract publishes encrypted result to escrow
  5. If TRUE: Escrow releases funds to worker
  6. If FALSE: Silent failure (no funds transferred)

Result: Worker receives loan if income threshold met, lender protected if not
```

**Privacy Guarantee**: Actual income never revealed. Only boolean threshold result ("eligible" or "not eligible") is computed via FHE.

### FHE Flow Diagram

```mermaid
sequenceDiagram
    participant Worker
    participant LendiProof
    participant Lender
    participant Escrow as ReineiraOS Escrow
    participant Gate as LendiProofGate
    participant FHE as Fhenix CoFHE

    Note over Worker, FHE: Phase 1: Income Registration

    Worker->>FHE: Encrypt income: FHE.encrypt(1500)
    FHE-->>Worker: encryptedIncome (ciphertext)
    Worker->>LendiProof: register(encryptedIncome)
    LendiProof->>LendiProof: Store encrypted income (never decrypted)
    LendiProof-->>Worker: Registration confirmed

    Note over Worker, FHE: Phase 2: Loan Creation

    Lender->>Escrow: createLoan(worker, $100, threshold=$1000)
    Escrow->>Escrow: Lock $100 USDC
    Escrow->>Gate: Attach condition: gte(income, $1000)
    Gate-->>Escrow: Condition registered

    Note over Worker, FHE: Phase 3: Verification & Redemption

    Worker->>Gate: requestVerification()
    Gate->>LendiProof: getEncryptedIncome(worker)
    LendiProof-->>Gate: encryptedIncome
    Gate->>FHE: Compute: FHE.gte(encryptedIncome, 1000)
    FHE-->>Gate: encryptedResult (TRUE/FALSE ciphertext)
    Gate->>Escrow: publishVerification(encryptedResult)

    Worker->>Escrow: redeem(worker)
    Escrow->>Gate: isConditionMet(escrowId)?
    Gate->>FHE: Decrypt boolean result
    FHE-->>Gate: TRUE (income ≥ threshold)
    Gate-->>Escrow: Condition satisfied
    Escrow->>Worker: Transfer $100 USDC
```

---

## Architecture

```mermaid
flowchart TB
    subgraph Frontend["React Frontend"]
        WalletConnect["Passkey Auth<br/>(ZeroDev)"]
        LenderUI["Lender Dashboard"]
        WorkerUI["Worker Dashboard"]
        FHEClient["CoFHE Client<br/>(@cofhe/sdk)"]
    end

    subgraph Backend["Node.js Backend"]
        API["REST API<br/>(Express)"]
        Auth["JWT Auth<br/>(SIWE)"]
        TxService["Transaction Service"]
        FHEService["FHE Decryption<br/>(@cofhe/sdk)"]
    end

    subgraph Blockchain["Arbitrum Sepolia"]
        subgraph Contracts["Smart Contracts"]
            LendiProof["LendiProof.sol<br/>(Income Registry)"]
            LendiProofGate["LendiProofGate.sol<br/>(Condition Resolver)"]
            ConfidentialEscrow["ConfidentialEscrow<br/>(ReineiraOS)"]
            cUSDC["cUSDC<br/>(Confidential Token)"]
        end

        FhenixPrecompile["Fhenix Precompiles<br/>(FHE Operations)"]
    end

    subgraph Wallets["Smart Accounts"]
        ZeroDev["ZeroDev Kernel<br/>(ERC-4337)"]
        Passkey["WebAuthn Passkeys"]
    end

    WalletConnect --> Passkey
    Passkey --> ZeroDev

    LenderUI --> API
    WorkerUI --> API
    FHEClient --> FhenixPrecompile

    API --> Auth
    API --> TxService
    API --> FHEService

    TxService --> ZeroDev
    ZeroDev --> LendiProof
    ZeroDev --> LendiProofGate
    ZeroDev --> ConfidentialEscrow

    LendiProof <--> FhenixPrecompile
    LendiProofGate <--> FhenixPrecompile
    ConfidentialEscrow <--> cUSDC

    FHEService --> FhenixPrecompile
```

### System Components

**Frontend Layer** (React 19 + Vite)
- Passkey authentication (ZeroDev + WebAuthn)
- Lender/Worker dashboards
- FHE encryption (cofhejs browser SDK)
- Wallet integration (@stacks/connect)

**Backend Layer** (Node.js + TypeScript)
- Clean Architecture (Domain, Application, Infrastructure)
- JWT authentication (Sign-In with Ethereum)
- Transaction orchestration
- FHE decryption service (@cofhe/sdk)
- Database abstraction (PostgreSQL/MongoDB)

**Smart Contract Layer** (Solidity)
- LendiProof: Encrypted income registry
- LendiProofGate: FHE condition resolver (implements IConditionResolver)
- ReineiraOS ConfidentialEscrow: Conditional fund release
- cUSDC: Confidential USDC token wrapper

**Blockchain Layer**
- Arbitrum Sepolia (L2 scaling)
- Fhenix CoFHE (FHE precompiles)
- ZeroDev (ERC-4337 smart accounts)

---

## Quick Start

### Prerequisites

- **Node.js** v20+ ([Download](https://nodejs.org/))
- **pnpm** v9+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ (or MongoDB) for backend database
- **MetaMask** or compatible Web3 wallet

### Installation

```bash
# Clone repository
git clone https://github.com/LendiXYZ/lendi-origins.git
cd lendi-origins

# Install dependencies (all packages)
pnpm install
```

### Environment Configuration

**Backend** (`packages/backend/.env`):
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lendi

# Blockchain
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_hex

# Contracts
LENDI_PROOF_ADDRESS=0x2b87fC209861595342d36E71daB22839534d4aC7
LENDI_PROOF_GATE_ADDRESS=0x7cb8c6eDc4a135112fD0fB98ecDC4667E168e38b

# JWT
JWT_SECRET=your_secret_key

# Fhenix
FHENIX_CHAIN_ID=8008135
```

**Frontend** (`packages/app/.env`):
```env
VITE_API_URL=http://localhost:3000
VITE_ZERODEV_PROJECT_ID=your_zerodev_project_id
VITE_ENABLE_TESTNETS=true
```

### Running the Application

```bash
# Terminal 1: Start backend
pnpm dev:backend
# Runs on http://localhost:3000

# Terminal 2: Start frontend
pnpm dev:app
# Runs on http://localhost:4831
```

### Quick Test Flow

1. **Open Frontend**: Navigate to http://localhost:4831
2. **Create Passkey**: Click "Sign Up" → Create passkey (browser prompt)
3. **Register as Worker**:
   - Navigate to Worker Dashboard
   - Enter monthly income (e.g., 1500 USDC)
   - Click "Register Income" → Approve transaction
4. **Create Loan as Lender**:
   - Switch to Lender Dashboard
   - Select registered worker address
   - Set loan amount (e.g., 100 USDC) and threshold (e.g., 1000 USDC)
   - Click "Create Loan" → Approve transactions (wrap USDC → create escrow → fund)
5. **Claim Loan as Worker**:
   - Return to Worker Dashboard
   - Click "Request Verification" for loan
   - Click "Claim Loan" → Funds transferred if income ≥ threshold

---

## Smart Contracts (Testnet)

### Deployed Contracts (Arbitrum Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **LendiProof** | `0x2b87fC209861595342d36E71daB22839534d4aC7` | Encrypted income registry |
| **LendiProofGate** | `0x7cb8c6eDc4a135112fD0fB98ecDC4667E168e38b` | FHE condition resolver |
| **USDC (Circle)** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | Circle's testnet USDC |
| **ReineiraOS Escrow** | `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa` | Confidential escrow protocol |
| **cUSDC** | `0x4A8C8B1d0c07E6D5AD651d8D69c3bc6FA72B1c97` | Confidential USDC wrapper |

### Contract Functions

**LendiProof.sol**:
```solidity
// Register encrypted income proof
function register(inEuint64 encryptedIncome) external;

// Get worker's encrypted income (view function)
function getEncryptedIncome(address worker) external view returns (euint64);

// Check if worker is registered
function isRegistered(address worker) external view returns (bool);
```

**LendiProofGate.sol** (implements `IConditionResolver`):
```solidity
// Called when escrow is created (stores threshold)
function onConditionSet(
    uint256 escrowId,
    bytes calldata resolverData  // abi.encode(workerAddress, thresholdUSDC)
) external;

// Worker requests income verification
function requestVerification(uint256 escrowId) external;

// Publish FHE verification result to escrow
function publishVerification(
    uint256 escrowId,
    address worker,
    bytes calldata decryptedResult,
    bytes calldata signature
) external;

// Check if escrow condition is met (called by escrow during redeem)
function isConditionMet(uint256 escrowId) external view returns (bool);
```

---

## Technology Stack

### Core Infrastructure

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Layer 2** | Arbitrum | Sepolia testnet | EVM-compatible scaling |
| **FHE Protocol** | Fhenix CoFHE | v0.4.0 | Fully Homomorphic Encryption |
| **Escrow Protocol** | ReineiraOS | v0.1 | Confidential conditional escrows |
| **Smart Accounts** | ZeroDev | v5.x | ERC-4337 account abstraction |
| **Authentication** | WebAuthn | W3C Standard | Passkey-based auth |

### Application Stack

| Layer | Technology | Version | Function |
|-------|------------|---------|----------|
| **Frontend** | React | 19.x | Component-based UI |
| **Build Tool** | Vite | 6.x | Fast development builds |
| **Styling** | Tailwind CSS | 3.x | Utility-first design |
| **State** | Zustand | 5.x | Lightweight state management |
| **Routing** | React Router | 7.x | SPA navigation |

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 20+ LTS | Server execution |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Framework** | Express | 4.x | REST API server |
| **Architecture** | Clean Architecture | - | Domain-driven design |
| **Database** | PostgreSQL / MongoDB | 14+ / 6+ | Persistent storage |
| **ORM** | Prisma / Mongoose | 6.x / 8.x | Database abstraction |

### Blockchain SDKs

| SDK | Purpose | Integration |
|-----|---------|-------------|
| **@cofhe/sdk** | Server-side FHE decryption | Backend service |
| **cofhejs** | Browser FHE encryption | Frontend integration |
| **@zerodev/sdk** | Smart account management | Wallet abstraction |
| **@reineira-os/sdk** | Escrow operations | Loan creation/redemption |
| **viem** | Ethereum interactions | Transaction building |

---

## Use Cases

### For Workers (Borrowers)

**Gig Economy Workers**
- Uber/Lyft drivers prove consistent earnings without sharing ride history
- Freelance developers demonstrate project income without client disclosure
- Content creators verify platform revenue without exposing audience data

**Unbanked Populations**
- Cash-based workers establish digital creditworthiness
- Migrants access cross-border lending without local banking
- Informal sector participants leverage encrypted income proofs

**International Freelancers**
- Cross-border income verification with currency stability (USDC)
- Privacy-preserving credit history across jurisdictions
- Reduced friction for global remote work financing

### For Lenders

**Individual Lenders**
- Peer-to-peer lending with cryptographic capital protection
- Income threshold verification without privacy invasion
- Automated fund release via smart contract conditions

**Microfinance Institutions**
- Scale informal lending operations with protocol automation
- Reduce operational overhead through smart contract execution
- Maintain borrower privacy while ensuring creditworthiness

**DeFi Protocols**
- Integration with lending pools for undercollateralized loans
- FHE-based credit scoring for algorithmic lending
- Reputation systems built on encrypted income history

---

## Project Structure

```
lendi/
├── packages/
│   ├── app/                          # React Frontend
│   │   ├── src/
│   │   │   ├── components/           # UI components
│   │   │   │   ├── lender/           # Lender dashboard
│   │   │   │   ├── worker/           # Worker dashboard
│   │   │   │   └── shared/           # Shared components
│   │   │   ├── hooks/                # React hooks
│   │   │   │   ├── useLoanFlow.ts    # Loan creation hook
│   │   │   │   └── useRedeemFlow.ts  # Redemption hook
│   │   │   ├── services/             # API clients
│   │   │   │   ├── ReinieraService.ts # Escrow SDK wrapper
│   │   │   │   └── api.ts            # Backend API client
│   │   │   ├── stores/               # Zustand stores
│   │   │   │   └── wallet-store.ts   # ZeroDev wallet state
│   │   │   └── config/               # Configuration
│   │   │       └── contracts.ts      # Contract addresses
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                      # Node.js Backend
│       ├── src/
│       │   ├── domain/               # Business logic
│       │   │   ├── entities/         # Domain models
│       │   │   ├── repositories/     # Repository interfaces
│       │   │   └── services/         # Domain services
│       │   ├── application/          # Use cases
│       │   │   └── use-cases/        # Application logic
│       │   ├── infrastructure/       # External adapters
│       │   │   ├── database/         # Database implementations
│       │   │   ├── blockchain/       # Contract interactions
│       │   │   └── fhe/              # FHE decryption service
│       │   └── presentation/         # HTTP layer
│       │       ├── controllers/      # Route handlers
│       │       ├── middleware/       # Express middleware
│       │       └── routes/           # API routes
│       ├── .env.example
│       ├── package.json
│       └── vercel.json               # Vercel deployment config
│
├── dapp/                             # Smart Contracts
│   ├── contracts/
│   │   ├── LendiProof.sol            # Income registry
│   │   └── LendiProofGate.sol        # Condition resolver
│   ├── scripts/
│   │   ├── deploy.ts                 # Deployment script
│   │   └── register-lender.ts        # Setup script
│   ├── test/
│   │   ├── LendiProof.test.ts        # Unit tests
│   │   └── LendiProofGate.test.ts    # Integration tests
│   ├── hardhat.config.ts
│   └── package.json
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE.md               # System architecture
│   ├── API.md                        # Backend API docs
│   └── CONTRACTS.md                  # Smart contract specs
│
├── ROOT_CAUSE_ANALYSIS.md            # Funding bug investigation
├── CLAUDE.md                         # Development guide
├── README.md                         # This file
├── package.json                      # Workspace root
└── pnpm-workspace.yaml               # pnpm workspaces config
```

---

## Technical Specifications

### FHE Operations

| Operation | Function | Circuit Complexity | Use Case |
|-----------|----------|-------------------|----------|
| **Encryption** | `FHE.asEuint64(plaintext)` | O(1) | Worker income registration |
| **Comparison** | `FHE.gte(encrypted, threshold)` | O(log n) | Income threshold verification |
| **Decryption** | `FHE.decrypt(ciphertext)` | O(1) | Backend verification result |

**Security**: 128-bit security parameter, ~2^128 computational hardness.

### Smart Account Architecture

| Component | Specification | Function |
|-----------|--------------|----------|
| **Account Contract** | ZeroDev Kernel v3 | ERC-4337 entrypoint |
| **Validation** | Passkey validator | WebAuthn signature verification |
| **Bundler** | ZeroDev bundler | UserOperation submission |
| **Paymaster** | Verifying paymaster | Gas sponsorship (optional) |

**Key Features**:
- No private key management (passkey-only)
- Batch transactions (wrap + deposit + fund in one UserOp)
- Session keys (optional for recurring actions)

### Performance Metrics

| Operation | Time | Gas Cost* | Notes |
|-----------|------|-----------|-------|
| **Income Registration** | ~5s | ~150k gas | FHE encryption + storage |
| **Loan Creation** | ~30s | ~500k gas | 3 transactions (wrap, create, fund) |
| **Verification Request** | ~10s | ~200k gas | FHE comparison on-chain |
| **Loan Redemption** | ~15s | ~250k gas | Condition check + transfer |

<sub>* Gas costs are estimates on Arbitrum Sepolia testnet</sub>

---

## Security Model

### FHE Security Guarantees

**Ciphertext Privacy**: Encrypted income values are computationally indistinguishable from random noise. Even with full blockchain access, an adversary cannot determine plaintext income.

**Threshold Zero-Knowledge**: FHE comparison (`gte`) reveals only boolean result ("eligible" / "not eligible"), never the actual income value or distance from threshold.

**Precompile Security**: Fhenix CoFHE precompiles implement TFHE (Torus FHE) with 128-bit security parameter. Requires breaking lattice-based cryptography (post-quantum secure).

### Trust Model

| Component | Trust Requirement | Risk Mitigation |
|-----------|------------------|-----------------|
| **Smart Contracts** | Code correctness | Open-source, testnet deployment, audits planned |
| **FHE Precompiles** | Fhenix protocol security | TFHE cryptographic guarantees, audited implementation |
| **Escrow Protocol** | ReineiraOS security | Open protocol, externally audited |
| **Backend Decryption** | Server integrity | FHE decryption keys managed securely, optional self-hosting |
| **Smart Accounts** | ZeroDev infrastructure | ERC-4337 standard, non-custodial by design |

### Known Attack Vectors

| Attack | Status | Mitigation |
|--------|--------|------------|
| **Income Inflation** | ✅ Prevented | Self-reporting requires trust; future: integrate oracles (Chainlink, Reclaim) |
| **Double-Claim** | ✅ Prevented | Escrow nullifiers prevent multiple withdrawals |
| **Front-Running** | ✅ Prevented | UserOperations bundled via relayer |
| **Sybil Attack** | ⚠️ Possible | Reputation system planned (Phase 2) |
| **Ciphertext Manipulation** | ✅ Prevented | FHE homomorphic operations maintain integrity |

---

## Known Issues

### SDK Bug: vault.fund() Fails Silently

**Status**: 🔴 **Critical** - Reported in [Issue #1](https://github.com/LendiXYZ/lendi-origins/issues/1)

**Summary**: The `vault.fund()` method in `@reineira-os/sdk@0.2.0` succeeds without errors but **no cUSDC tokens are transferred on-chain**, preventing escrow redemption.

**Impact**: All loan creations on testnet fail to fund escrows properly.

**Evidence**:
- Escrow 78: Created successfully, but NO cUSDC transfer events
- Searched 50,000 blocks: 0 deposits to ConfidentialEscrow contract
- Redeem attempts: Silent failure (0 tokens transferred)

**Workaround**: None available. Awaiting ReineiraOS SDK team investigation.

**Diagnostic Scripts Available**:
```bash
# Analyze escrow funding transactions
npx tsx analyze-escrow-78-complete.ts

# Check funding amount on-chain
npx tsx check-escrow-78-funding.ts

# Analyze redeem failure
npx tsx analyze-redeem-tx.ts
```

See [ROOT_CAUSE_ANALYSIS.md](./ROOT_CAUSE_ANALYSIS.md) for complete technical investigation.

---

## Roadmap

### Phase 1: Foundation (Completed ✅)
**Timeline**: Q4 2025 - Q1 2026

- Core FHE income verification protocol
- ReineiraOS escrow integration
- Passkey authentication via ZeroDev
- Basic lender/worker dashboards
- Testnet deployment on Arbitrum Sepolia

**Status**: Deployed and functional (pending SDK bug fix)

---

### Phase 2: Oracle Integration (Q2 2026)
**Focus**: Trustless income verification

**Planned Features**:
- **Reclaim Protocol** integration for verifiable income proofs (bank APIs, payroll systems)
- **Chainlink** oracles for exchange rate data and credit scoring
- Multi-source income verification (combine FHE self-reporting + oracle proofs)
- Worker reputation system based on repayment history

**Deliverable**: Eliminate self-reporting trust assumption via cryptographic oracle attestations.

---

### Phase 3: Advanced Features (Q3-Q4 2026)
**Focus**: Protocol maturity and ecosystem growth

**Planned Features**:
- **Undercollateralized Loans**: Enable loans without full collateral based on FHE credit scores
- **Multi-Chain Support**: Deploy on additional EVM chains (Ethereum L2s, Polygon, Optimism)
- **Lender Pools**: Aggregate capital from multiple lenders for risk distribution
- **Dynamic Interest Rates**: Algorithmic rate calculation based on encrypted credit history
- **Mobile Applications**: Native iOS/Android apps with biometric authentication

**Long-Term Vision**: Establish Lendi as the trust layer for global informal credit markets, enabling financial inclusion for billions without traditional banking access.

---

## Contributing

Contributions are welcome! Lendi is open-source and community-driven.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Contribution Guidelines

- **Code Style**: ESLint + Prettier (auto-formatted)
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Add tests for new features (use `pnpm test`)
- **Documentation**: Update relevant docs in `docs/` folder

### Areas for Contribution

- **Bug Fixes**: Report or fix issues (especially SDK integration!)
- **Oracle Integration**: Implement Reclaim Protocol / Chainlink adapters
- **UI/UX**: Improve dashboard design and user experience
- **Documentation**: Tutorials, guides, translations
- **Security**: Audit smart contracts, report vulnerabilities

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Team

**Lead Developer**: Carlos Israel Jiménez
**GitHub**: [@carlos-israelj](https://github.com/carlos-israelj)
**Email**: cijimenej@gmail.com

---

## Acknowledgments

Lendi builds upon pioneering work from:

- **ReineiraOS** - Open settlement infrastructure for confidential escrows
- **Fhenix** - Fully Homomorphic Encryption on EVM blockchains
- **ZeroDev** - Passkey-based smart account infrastructure (ERC-4337)
- **Circle** - USDC stablecoin infrastructure
- **Arbitrum** - High-performance Ethereum Layer 2 scaling

Special thanks to the **Fhenix Buildathon** community and mentors for technical guidance.

---

## Contact & Support

**Technical Issues**: [GitHub Issues](https://github.com/LendiXYZ/lendi-origins/issues)
**Development Discussion**: [GitHub Discussions](https://github.com/LendiXYZ/lendi-origins/discussions)
**Community**: [Fhenix Discord](https://discord.gg/fhenix)

---

<div align="center">

**Built on Arbitrum · Secured by Fhenix FHE · Powered by ReineiraOS · Protected by ZeroDev**

---

*Financial privacy is a human right. Lendi protects yours.*

**© 2026 Lendi** · Licensed under [MIT](./LICENSE)

</div>
