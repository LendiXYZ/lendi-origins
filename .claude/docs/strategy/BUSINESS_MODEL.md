# Business Model — Lendi

## Revenue Streams

| Stream                  | Fee/Price             | Margin | Status  |
| ----------------------- | --------------------- | ------ | ------- |
| Lender registration fee | 1 USDC (configurable) | ~95%   | Testnet |
| Origination spread      | 0.5-1.5% per loan     | ~90%   | Wave 3+ |
| Insurance premium       | 2-4% of loan value    | 70-90% | Wave 3+ |

### Revenue Model

Wise-style transparent fee model — flat origination fee (0.5-1.5%) + optional insurance premium
(2-4%), no hidden spreads. Currently testnet with test USDC.

## Pricing

TBD for mainnet; testnet uses test USDC. Lender registration fee is 1 USDC on testnet (configurable
via InformalProof contract).

## Key Assumptions

1. 47M+ informal workers in LATAM earn in stablecoins or digital rails but lack payslips
2. FHE-encrypted income proofs are a sufficient trust primitive for small-ticket lending
3. Colombia-first market has enough crypto-native informal workers to validate

## Unit Economics Targets

| Metric         | Target    | Current |
| -------------- | --------- | ------- |
| CAC            | TBD       | —       |
| LTV            | TBD       | —       |
| LTV:CAC        | >3:1      | —       |
| Gross margin   | >70%      | —       |
| Payback period | <6 months | —       |

## Risks

1. Regulatory: MiCA / AML-KYC for fiat ramps; GDPR if EU users
2. Market: Informal workers may resist on-chain income recording
3. Technical: CoFHE async UX (10-30s) may cause drop-offs; FHE gas costs

## 5-Year Arc

| Year | Milestone                    | Target           |
| ---- | ---------------------------- | ---------------- |
| 1    | Testnet MVP + Colombia pilot | 100 active users |
| 2    | Mainnet + insurance pools    | 1000 users, GMV  |
| 3    | LATAM expansion + API/B2B    | 10K users        |
