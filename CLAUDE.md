# Lendi — Product Application

## Version

- **App version:** 0.1.0
- **Platform version:** 0.1
- **Version config:** `reineira.json` at project root

## What this repo is

Lendi product monorepo — two-sided trust infrastructure for informal credit. Workers prove income
without revealing it; lenders deploy capital with protocol-grade protection.

Built on ReineiraOS (ConfidentialEscrow + InformalProofGate) with Fhenix CoFHE encryption.

## Structure

```
packages/
  backend/       — @lendi/backend (TypeScript, Clean Architecture, Vercel-ready)
  app/           — @lendi/app (React 19, ZeroDev, passkey auth)
```

## On-chain contracts (Arbitrum Sepolia)

| Contract          | Address                                    |
| ----------------- | ------------------------------------------ |
| InformalProof     | 0x2b87fC209861595342d36E71daB22839534d4aC7 |
| InformalProofGate | 0x7cb8c6eDc4a135112fD0fB98ecDC4667E168e38b |
| USDC (Circle)     | 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d |

## Key facts

- Spanish-first product UX
- Dark theme default (navy + lime palette)
- No plaintext income/loan amounts stored in backend DB
- ZeroDev smart accounts with passkey auth
- CoFHE async UX (10-30s expectations for FHE operations)

## Build & Dev

```bash
pnpm install                    # Install all deps
pnpm dev:backend                # Run backend dev server
pnpm dev:app                    # Run platform app (port 4831)
pnpm build                      # Build all packages
pnpm test                       # Test all packages
```
