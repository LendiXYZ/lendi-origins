# PIECE 1 - ERC-8004 Agent Registration

## Status: ✅ Code Complete

## Implemented Files

### 1. Dependencies
- ✅ Installed `agent0-sdk@^1.7.1` (+377 dependencies)

### 2. API Endpoints

#### `/api/agent-json.ts`
Returns ERC-8004 agent metadata for LendiVerifier.

**URL:** `https://lendi-origins.vercel.app/api/agent-json`

**Response:**
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "LendiVerifier",
  "description": "Privacy-first income verifier for informal workers in Latin America. Prove what you earn. Reveal nothing.",
  "image": "https://lendi-origin.vercel.app/logo.png",
  "services": [
    {
      "name": "A2A",
      "endpoint": "https://lendi-origins.vercel.app/agent.json",
      "version": "0.3.0"
    }
  ],
  "x402Support": true,
  "active": true,
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

#### `/api/agent-registration-json.ts`
Returns agent registration with `AGENT_ID` from environment variables.

**URL:** `https://lendi-origins.vercel.app/api/agent-registration-json`

**Response:**
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "LendiVerifier",
  "registrations": [
    {
      "agentId": "<AGENT_ID_FROM_ENV>",
      "agentRegistry": "eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e"
    }
  ]
}
```

### 3. Registration Script

#### `/packages/backend/scripts/register-agent.ts`
One-time script to register Lendi agent on ERC-8004 (ETH Sepolia).

**Run:**
```bash
cd packages/backend
tsx scripts/register-agent.ts
```

**Requirements:**
- `ETH_SEPOLIA_PRIVATE_KEY` - Private key for signing
- `ETH_SEPOLIA_RPC_URL` - ETH Sepolia RPC (https://rpc.ankr.com/eth_sepolia)
- `LENDI_VERIFIER_URL` - Backend URL (https://lendi-origins.vercel.app)

**Output:**
```
✅ LendiVerifier registered on ETH Sepolia!
Agent ID: <generated_agent_id>

Next steps:
1. Set AGENT_ID in Vercel dashboard
2. Update public/agent-registration.json with agentId
3. View at: https://8004scan.io/agents/<agent_id>
```

### 4. Configuration

#### `/packages/backend/src/core/config.ts`
Added new environment variables:

```typescript
// ERC-8004 — ETH Sepolia
ETH_SEPOLIA_RPC_URL: z.string().url().optional(),
ETH_SEPOLIA_PRIVATE_KEY: z.string().optional(),
AGENT_ID: z.string().optional(),
LENDI_VERIFIER_URL: z.string().url().optional(),

// x402 — Base Sepolia
BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
BASE_SEPOLIA_RECEIVER_ADDRESS: z.string().optional(),
X402_FACILITATOR_URL: z.string().url().default('https://x402.org/facilitator'),
X402_PRICE_USDC: z.coerce.number().default(0.001),
```

### 5. Static Files

#### `/packages/backend/public/agent.json`
ERC-8004 agent metadata (for reference).

#### `/packages/backend/public/agent-registration.json`
Agent registration template (update with actual `AGENT_ID` after registration).

## Environment Variables Needed

Add to Vercel dashboard AFTER running register-agent.ts:

```env
# ERC-8004 — ETH Sepolia
ETH_SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
ETH_SEPOLIA_PRIVATE_KEY=0x... # Same or different from SIGNER_PRIVATE_KEY
LENDI_VERIFIER_URL=https://lendi-origins.vercel.app

# AFTER registration:
AGENT_ID=<generated_agent_id>

# x402 — Base Sepolia (for future use)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_RECEIVER_ADDRESS=0x...  # Wallet to receive payments
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_PRICE_USDC=0.001
```

## Testing

### After Deployment to Vercel:

```bash
# Test agent metadata endpoint
curl https://lendi-origins.vercel.app/api/agent-json | jq .

# Test agent registration endpoint
curl https://lendi-origins.vercel.app/api/agent-registration-json | jq .
```

**Expected Response (agent-json):**
- ✅ Returns JSON with `name: "LendiVerifier"`
- ✅ Returns `x402Support: true`
- ✅ Returns `active: true`

**Expected Response (agent-registration-json):**
- ✅ Returns `agentId` from environment (or placeholder if not set)
- ✅ Returns correct registry address `eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e`

### Register Agent on ETH Sepolia:

```bash
# Ensure environment variables are set in .env
cd packages/backend
tsx scripts/register-agent.ts
```

**Expected Output:**
- ✅ Connects to ETH Sepolia
- ✅ Creates agent with Agent0 SDK
- ✅ Registers via HTTP (no Pinata required)
- ✅ Returns `agentId` to set in Vercel

## Next Steps

1. ✅ Deploy to Vercel (code complete)
2. ⏳ Test `/api/agent-json` endpoint in production
3. ⏳ Set environment variables in Vercel dashboard
4. ⏳ Run `register-agent.ts` script to get `AGENT_ID`
5. ⏳ Update `AGENT_ID` in Vercel environment
6. ⏳ Test `/api/agent-registration-json` endpoint
7. ⏳ Verify registration at https://8004scan.io

## Notes

- Local dev server may not serve these endpoints correctly due to Vercel routing
- Endpoints will work correctly in Vercel production environment
- The ERC-8004 registration is a one-time operation
- Agent metadata is served statically and doesn't require database

## Dependencies

- `agent0-sdk@^1.7.1` - ERC-8004 registration
- `viem` - Ethereum client (already installed)
- `dotenv` - Environment variables (already installed)
