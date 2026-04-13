# Competitive Landscape — Lendi

## Direct Competitors

| Competitor      | What They Do                     | Weakness                           | Our Advantage                     |
| --------------- | -------------------------------- | ---------------------------------- | --------------------------------- |
| Traditional MFI | Microfinance with full KYC       | Requires full financial disclosure | FHE: prove income, reveal nothing |
| Goldfinch       | DeFi undercollateralized lending | No income privacy, pool risk       | Encrypted individual proofs       |
| Credix          | Credit marketplace for EM        | Institutional only, no privacy     | Informal worker access + FHE      |

## Indirect Competitors / Workarounds

- Workers show bank screenshots / payslips manually (fraud-prone, privacy-violating)
- Lenders exclude informal workers entirely (market gap)
- Community trust circles with no formal verification (limited scale)
- ZK-based income proofs (no mutable encrypted state — can't accumulate over time)

## FHE Advantage

| Feature                   | Lendi       | Traditional | ZK Solutions | Other DeFi |
| ------------------------- | ----------- | ----------- | ------------ | ---------- |
| Encrypted income ledger   | Yes         | No          | No           | No         |
| Boolean-only proof output | Yes (ebool) | No          | Partial      | No         |
| Mutable encrypted state   | Yes (CoFHE) | No          | No           | No         |
| Non-custodial             | Yes         | No          | Yes          | Partial    |
| Confidential escrow       | Yes         | No          | No           | No         |
| Cross-chain (CCTP)        | Future      | No          | No           | Partial    |

## Positioning

FHE-native income verification for informal workers — the only solution where income stays
encrypted while the protocol computes qualification proofs.

## Threats to Watch

1. Fhenix CoFHE mainnet delays (currently targeting autumn 2026)
2. ZK competitors adding mutable state (unlikely near-term)
3. Traditional fintechs entering LATAM informal credit with centralized privacy
