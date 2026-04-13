# Protocol Integration — Lendi

## Primitives Used

| Primitive             | Used | Purpose                                            |
| --------------------- | ---- | -------------------------------------------------- |
| ConfidentialEscrow    | Yes  | Loan settlement — hold funds until income verified |
| InformalProofGate     | Yes  | IConditionResolver — releases escrow on proof      |
| CoverageManager       | No   | Wave 3+ — lender protection insurance              |
| PoolFactory           | No   | Wave 3+ — insurance pool creation                  |
| CCTP v2 (cross-chain) | No   | Future — cross-chain USDC loans                    |
| Meta-transactions     | No   | Future — gasless UX                                |

## Contract Addresses (Arbitrum Sepolia)

| Contract          | Address                                    |
| ----------------- | ------------------------------------------ |
| InformalProof     | 0x2b87fC209861595342d36E71daB22839534d4aC7 |
| InformalProofGate | 0x7cb8c6eDc4a135112fD0fB98ecDC4667E168e38b |
| USDC (Circle)     | 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d |

Chain ID: 421614

## Protocol Flow

```
1. Worker onboards with ZeroDev smart account
2. Worker registers on InformalProof contract
3. Income events encrypted client-side via cofhejs -> recordIncome(InEuint64)
4. Lender registers + pays registration fee
5. Lender creates loan terms
6. Backend creates ConfidentialEscrow with InformalProofGate as resolver
7. InformalProofGate.linkEscrow(escrowId, worker, threshold) called
8. Lender calls proveIncome(worker, threshold) -> ebool result
9. Lender sees qualified/not qualified only (never income figure)
10. If qualified: escrow condition met -> ConfidentialEscrow.redeem() releases funds
11. Loan repayment tracked off-chain; escrow settles
```

## Resolver Design

- **Name:** InformalProofGate
- **Type:** FHE income threshold verification
- **Condition:** `monthlyIncome >= threshold` computed homomorphically, exposed as `ebool`
- **Storage:** Mapping of escrowId -> (worker address, income threshold)
- **Open items:**
  - Implement real `isConditionMet` (currently always returns true)
  - Align IConditionResolver ID types with Reiniera escrow ABI
  - Gate/backend signer must satisfy `onlyLender` ACL

## SDK Integration

```typescript
import { ReineiraSDK } from '@reineira-os/sdk';

const sdk = ReineiraSDK.create({ network: 'testnet', privateKey: process.env.PRIVATE_KEY });
await sdk.initialize();

const escrow = await sdk.escrow
  .build()
  .amount(sdk.stablecoin(loanAmount))
  .owner(workerAddress)
  .condition(INFORMAL_PROOF_GATE_ADDRESS, linkEscrowData)
  .create();
```

## Testing

```bash
# In dapp/ repo
npm install --legacy-peer-deps
npx hardhat test test/InformalProof.test.ts
```
