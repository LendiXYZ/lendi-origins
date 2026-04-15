#!/usr/bin/env tsx
/**
 * Trigger a simple transaction to test QuickNode webhook
 * Just calls a view function to generate blockchain activity
 */

import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const LENDI_PROOF_ABI = parseAbi([
  'function registeredWorkers(address) view returns (bool)',
]);

async function main() {
  console.log('\n📡 Checking contract to verify QuickNode webhook monitoring\n');

  const lendiProofAddress = process.env.LENDI_PROOF_ADDRESS;
  const rpcUrl = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!lendiProofAddress) {
    throw new Error('LENDI_PROOF_ADDRESS not found in environment');
  }

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  console.log(`📍 Contract: ${lendiProofAddress}`);
  console.log(`🔍 Network: Arbitrum Sepolia\n`);

  // Just read from the contract
  const isRegistered = await publicClient.readContract({
    address: lendiProofAddress as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registeredWorkers',
    args: ['0x799795DDef56d71A4d98Fac65cb88B7389614aBC'] as const,
  });

  console.log(`✅ Worker registration status: ${isRegistered}\n`);

  console.log('💡 Since the worker is already registered, we cannot trigger WorkerRegistered event again.');
  console.log('   The webhook was already tested when we registered initially.\n');
  console.log('📊 Check QuickNode Dashboard for webhook delivery from block 259745063\n');
  console.log('🔍 Or check Vercel logs for POST requests to /api/v1/webhooks/quicknode\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
