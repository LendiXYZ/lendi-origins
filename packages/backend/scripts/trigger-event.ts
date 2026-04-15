#!/usr/bin/env tsx
/**
 * Trigger a simple event to test QuickNode webhook
 * Uses registerWorker if not registered, or we can record income
 */

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

const LENDI_PROOF_ABI = parseAbi([
  'function registerWorker() external',
  'function registeredWorkers(address) view returns (bool)',
  'event WorkerRegistered(address indexed worker)',
]);

async function main() {
  console.log('\n🔔 Triggering Event for QuickNode Webhook Test\n');

  const testPrivateKey = process.env.SIGNER_PRIVATE_KEY;
  const lendiProofAddress = process.env.LENDI_PROOF_ADDRESS;
  const rpcUrl = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!testPrivateKey || !lendiProofAddress) {
    throw new Error('Missing required env vars');
  }

  const account = privateKeyToAccount(testPrivateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  console.log(`📍 Contract: ${lendiProofAddress}`);
  console.log(`👤 Account:  ${account.address}\n`);

  // Check current status
  const isRegistered = await publicClient.readContract({
    address: lendiProofAddress as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registeredWorkers',
    args: [account.address],
  });

  console.log(`Worker registered: ${isRegistered}\n`);

  if (isRegistered) {
    console.log('⚠️  Worker already registered - no new event will be emitted');
    console.log('   To test webhook, we need to trigger a different event (IncomeRecorded, etc.)\n');
    console.log('💡 Recommendation: Use E2E testing script with a fresh wallet address\n');
    return;
  }

  // Register worker
  console.log('📤 Registering worker...\n');
  const hash = await walletClient.writeContract({
    address: lendiProofAddress as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registerWorker',
  });

  console.log(`✅ Transaction: ${hash}`);
  console.log(`🔍 Explorer: https://sepolia.arbiscan.io/tx/${hash}\n`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`✅ Confirmed in block: ${receipt.blockNumber}\n`);
  console.log(`📊 Now check QuickNode Payload Testing with block: ${receipt.blockNumber}\n`);
  console.log(`⏳ Wait 30-60 seconds for QuickNode to index the block\n`);
  console.log(`🔔 Then check Vercel logs for webhook delivery\n`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
