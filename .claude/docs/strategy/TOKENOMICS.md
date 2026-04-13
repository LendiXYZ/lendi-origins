# Tokenomics & Incentive Design — Lendi

## Open Economy Role

Lendi primarily operates as a **Policy Builder** + future **Pool Underwriter** in the ReineiraOS
open economy.

| Role             | Description                                  | Revenue Mechanism          |
| ---------------- | -------------------------------------------- | -------------------------- |
| Policy Builder   | InformalProofGate as IConditionResolver      | Origination fee per loan   |
| Pool Underwriter | Future: lender protection pools              | Net premiums - claims      |
| LP Staker        | Future: community liquidity for lender pools | Proportional premium share |

## Flywheel

```
More workers record income -> More verifiable borrowers ->
More lenders register -> More loans originated ->
More origination fees -> Better risk data ->
Better insurance pricing -> More lender protection ->
More lender confidence -> More capital deployed -> ...
```

## Fee Structure

| Fee                 | Rate     | Who Pays | Who Earns    |
| ------------------- | -------- | -------- | ------------ |
| Lender registration | 1 USDC   | Lender   | Protocol     |
| Origination fee     | 0.5-1.5% | Borrower | Lendi        |
| Insurance premium   | 2-4%     | Lender   | Pool / Lendi |

## Sustainability Analysis

- **Break-even:** ~$50K monthly loan volume at 1% origination fee
- **Subsidy-free:** Yes — origination fees are real revenue from day 1
- **Risk:** Default rates in informal credit are typically 5-15%; insurance must price accordingly

## Token Design

Not applicable for Wave 2. Lendi should NOT launch a token at this stage. Focus on real revenue
from origination fees and building a track record of loan performance data.
