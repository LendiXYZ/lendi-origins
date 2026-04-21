import { SDK } from 'agent0-sdk';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function registerAgent() {
  console.log('\n🔐 Registering Lendi Agent on ERC-8004 (ETH Sepolia)');
  console.log('═'.repeat(80));

  // Validate environment variables
  if (!process.env.ETH_SEPOLIA_PRIVATE_KEY) {
    throw new Error('ETH_SEPOLIA_PRIVATE_KEY not found in .env');
  }
  if (!process.env.ETH_SEPOLIA_RPC_URL) {
    throw new Error('ETH_SEPOLIA_RPC_URL not found in .env');
  }
  if (!process.env.LENDI_VERIFIER_URL) {
    throw new Error('LENDI_VERIFIER_URL not found in .env');
  }

  const account = privateKeyToAccount(process.env.ETH_SEPOLIA_PRIVATE_KEY as `0x${string}`);

  console.log(`Signer address: ${account.address}`);
  console.log(`RPC URL: ${process.env.ETH_SEPOLIA_RPC_URL}`);
  console.log(`Verifier URL: ${process.env.LENDI_VERIFIER_URL}`);
  console.log('');

  // Create wallet client
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.ETH_SEPOLIA_RPC_URL),
  });

  console.log('1️⃣  Creating Agent0 SDK instance...');
  const sdk = new SDK({ walletClient, chain: 'sepolia' });

  console.log('2️⃣  Creating agent configuration...');
  const agent = await sdk.createAgent();

  // Configure agent
  agent.setX402Support(true);
  agent.setActive(true);
  agent.addDomain('finance_and_business/financial_services/lending', true);
  agent.addSkill('natural_language_processing/text_classification');

  console.log('3️⃣  Registering agent via HTTP...');
  console.log(`    Metadata URL: ${process.env.LENDI_VERIFIER_URL}/agent.json`);

  // HTTP registration — no Pinata required
  const agentId = await agent.registerHTTP(`${process.env.LENDI_VERIFIER_URL}/agent.json`);

  console.log('');
  console.log('═'.repeat(80));
  console.log('✅ LendiVerifier registered on ETH Sepolia!');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`Agent ID: ${agentId}`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. Set AGENT_ID in Vercel dashboard: ${agentId}`);
  console.log(`2. Update public/agent-registration.json with agentId`);
  console.log(`3. View at: https://8004scan.io/agents/${agentId}`);
  console.log('');
}

registerAgent().catch((error) => {
  console.error('\n❌ Registration failed:', error.message);
  process.exit(1);
});
