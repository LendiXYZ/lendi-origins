# Lendi

[![Platform](https://img.shields.io/badge/ReineiraOS-v0.1-blue)](https://reineira.xyz)

Two-sided trust infrastructure for informal credit — workers prove income without revealing it;
lenders deploy capital with protocol-grade protection.

> Prove what you earn. Reveal nothing.

## Packages

| Package            | Stack                                                     | Purpose      |
| ------------------ | --------------------------------------------------------- | ------------ |
| `packages/backend` | TypeScript, Clean Architecture, Vercel-ready, DB-agnostic | Backend API  |
| `packages/app`     | React 19, ZeroDev smart accounts, passkey auth            | Platform app |

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev:backend          # Backend dev server
pnpm dev:app              # Platform app (port 4831)
pnpm build                # Build all packages
pnpm test                 # Test all packages
```

## Built on

- [ReineiraOS](https://reineira.xyz) — Open settlement infrastructure
- [Fhenix CoFHE](https://fhenix.io) — FHE on EVM
- [ZeroDev](https://zerodev.app) — ERC-4337 smart accounts

## License

MIT
