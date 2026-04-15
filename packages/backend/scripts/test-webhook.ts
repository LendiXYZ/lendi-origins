#!/usr/bin/env tsx
/**
 * Quick webhook test - Register a worker to trigger WorkerRegistered event
 * This will test if QuickNode stream picks up events and sends to backend
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
  console.log('\n🧪 Quick Webhook Test - Registering Test Worker\n');

  // Read from env
  const testPrivateKey = process.env.TEST_PRIVATE_KEY || process.env.SIGNER_PRIVATE_KEY;
  const lendiProofAddress = process.env.LENDI_PROOF_ADDRESS;
  const rpcUrl = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!testPrivateKey) {
    throw new Error('TEST_PRIVATE_KEY or SIGNER_PRIVATE_KEY not found in environment');
  }
  if (!lendiProofAddress) {
    throw new Error('LENDI_PROOF_ADDRESS not found in environment');
  }

  // Setup clients
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

  console.log('📋 Test Configuration:');
  console.log(`   Test Worker Address: ${account.address}`);
  console.log(`   LendiProof:          ${lendiProofAddress}`);
  console.log(`   Network:             Arbitrum Sepolia (${arbitrumSepolia.id})`);
  console.log(`   RPC:                 ${rpcUrl}\n`);

  // Check if already registered
  const isAlreadyRegistered = await publicClient.readContract({
    address: lendiProofAddress as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registeredWorkers',
    args: [account.address],
  });

  if (isAlreadyRegistered) {
    console.log('✅ Worker is ALREADY registered');
    console.log('   This is fine - no new event will be emitted');
    console.log('   To test webhook, use a different address or wait for income events\n');
    return;
  }

  console.log('📤 Registering worker to trigger WorkerRegistered event...\n');

  try {
    const hash = await walletClient.writeContract({
      address: lendiProofAddress as Address,
      abi: LENDI_PROOF_ABI,
      functionName: 'registerWorker',
    });

    console.log('✅ Transaction sent:');
    console.log(`   Hash: ${hash}`);
    console.log(`   Explorer: https://sepolia.arbiscan.io/tx/${hash}`);
    console.log('   Waiting for confirmation...\n');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ SUCCESS! Worker registered');
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed}\n`);

      console.log('🔔 QuickNode Stream should now:');
      console.log('   1. Detect the WorkerRegistered event');
      console.log('   2. Filter it (if address matches LendiProof)');
      console.log('   3. Send webhook to backend');
      console.log('   4. Backend processes and logs the event\n');

      console.log('📊 Check webhook delivery:');
      console.log('   - QuickNode Dashboard → Your Stream → Delivery Stats');
      console.log('   - Vercel Logs: https://vercel.com/dashboard → lendi-origins → Logs');
      console.log('   - Look for: "Webhook received from QuickNode"\n');

      // Wait a bit for webhook to arrive
      console.log('⏳ Waiting 10 seconds for webhook delivery...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('✅ Test complete!');
      console.log('   Check the logs above to verify webhook was received\n');
    } else {
      console.error('❌ Transaction failed (reverted)');
      console.error(`   Status: ${receipt.status}\n`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error registering worker:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
