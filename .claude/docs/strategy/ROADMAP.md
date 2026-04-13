# Roadmap — Lendi

## Current Phase: MVP (Wave 2 pilot)

## Priorities (from brief)

1. Unblock integrations: confirm ConfidentialEscrow addresses, resolver interface shape, SDK escrow + condition encoding for InformalProofGate + linkEscrow ordering
2. Harden gate + ACL: implement truthful isConditionMet; register gate/backend signer as lender; add integration tests
3. Bootstrap product monorepo: platform-modules -> app + backend with env templates; wire InformalProof addresses + CoFHE client; Spanish shell + ZeroDev + income path

## Phase Plan

### Wave 1: Core Contracts (DONE)

- InformalProof deployed on Arbitrum Sepolia
- InformalProofGate deployed as IConditionResolver
- Basic recordIncome + proveIncome flow working
- Contract verification complete

### Wave 2: Integrated App + Backend (IN PROGRESS)

- Bootstrap product app from platform-modules
- Wire InformalProof addresses + CoFHE client
- Spanish-first ZeroDev smart account onboarding
- Backend: SIWE/JWT auth, loan/escrow orchestration
- Implement truthful isConditionMet in InformalProofGate
- End-to-end escrow flow on testnet
- Target: 10-50 testnet users

### Wave 3: Insurance + Growth

- ReineiraOS CoverageManager integration
- Insurance pool for lender protection
- Cross-chain expansion via CCTP v2
- Content marketing in Spanish
- First 100 real users

### Wave 4: Mainnet + Scale

- Smart contract audit
- Mainnet deployment with real USDC
- Wise-style fee model activated
- Local AI advisor (WebLLM)
- API / white-label offering

## Go/No-Go Gates

| Gate        | Criteria                                                    | Status      |
| ----------- | ----------------------------------------------------------- | ----------- |
| Wave 1 -> 2 | Contracts deployed + verified, basic flow tested            | Done        |
| Wave 2 -> 3 | 10+ testnet users, e2e escrow flow, truthful isConditionMet | In progress |
| Wave 3 -> 4 | 100+ users, positive unit economics, audit scheduled        | Not started |
