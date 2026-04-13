# @lendi/contracts

Smart contracts for Lendi - FHE-based income verification protocol.

## Contracts

- **LendiProof.sol** - Core FHE contract for encrypted income verification
- **LendiProofGate.sol** - Condition resolver for ReinieraOS escrow integration

## Setup

```bash
# Install dependencies
pnpm install

# Compile contracts
pnpm compile

# Run tests
pnpm test

# Clean artifacts
pnpm clean
```

## Deployment

### Local
```bash
pnpm deploy:local
```

### Arbitrum Sepolia
```bash
pnpm deploy:testnet
```

## Testing

All tests use CoFHE mock contracts for FHE simulation:
- 26 tests passing
- Coverage for all main functions

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PRIVATE_KEY=your-private-key
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ETHERSCAN_API_KEY=your-etherscan-key
ARBISCAN_API_KEY=your-arbiscan-key
```

## Key Changes (Wave 2)

- ✅ escrowId changed from `bytes32` to `uint256` (ReinieraOS compatibility)
- ✅ Contracts renamed from InformalProof to Lendi
- ✅ All tests updated and passing
