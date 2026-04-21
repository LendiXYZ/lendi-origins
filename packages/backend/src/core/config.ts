import { z } from 'zod';

const EnvSchema = z.object({
  // Database
  DB_PROVIDER: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().default('lendi-api'),
  ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592000),

  // Blockchain
  CHAIN_ID: z.coerce.number().default(421614),
  RPC_URL: z.string().url(),
  SIGNER_PRIVATE_KEY: z.string().optional(),

  // Server
  ALLOWED_ORIGINS: z.string().default('http://localhost:4831,http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PORT: z.coerce.number().default(3000),

  // Webhooks
  QUICKNODE_WEBHOOK_SECRET: z.string().optional(),
  RELAY_WEBHOOK_SECRET: z.string().optional(),

  // Lendi Contracts (Wave 2)
  LENDI_PROOF_ADDRESS: z.string().optional(),
  LENDI_PROOF_GATE_ADDRESS: z.string().optional(),
  LENDI_POLICY_ADDRESS: z.string().optional(),
  USDC_ADDRESS: z.string().default('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'),

  // ReinieraOS Contracts
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  COVERAGE_MANAGER_ADDRESS: z.string().optional(),
  POOL_FACTORY_ADDRESS: z.string().optional(),
  POLICY_REGISTRY_ADDRESS: z.string().optional(),
  CONFIDENTIAL_USDC_ADDRESS: z.string().optional(),
  PUSDC_WRAPPER_ADDRESS: z.string().optional(),

  // ReinieraOS API
  REINEIRA_API_KEY: z.string().optional(),

  // FHE Worker
  FHE_WORKER_URL: z.string().default('http://localhost:3001'),

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
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = EnvSchema.parse(process.env);
  }
  return _env;
}
