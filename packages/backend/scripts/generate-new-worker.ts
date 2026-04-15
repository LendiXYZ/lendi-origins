#!/usr/bin/env tsx
/**
 * Generate a new test wallet and register as worker to trigger event
 */

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

const LENDI_PROOF_ABI = parseAbi([
  'function registerWorker() external',
  'event WorkerRegistered(address indexed worker)',
]);

async function main() {
  console.log('\n🆕 Generating New Test Wallet for Worker Registration\n');

  // Generate new wallet
  const newPrivateKey = generatePrivateKey();
  const newAccount = privateKeyToAccount(newPrivateKey);

  console.log('🔑 New Test Wallet:');
  console.log(`   Address: ${newAccount.address}`);
  console.log(`   Private Key: ${newPrivateKey}\n`);

  // Use deployer wallet to send some ETH to new wallet for gas
  const deployerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
  const lendiProofAddress = process.env.LENDI_PROOF_ADDRESS;
  const rpcUrl = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!deployerPrivateKey || !lendiProofAddress) {
    throw new Error('Missing required env vars');
  }

  const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const deployerWallet = createWalletClient({
    account: deployerAccount,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: deployerAccount.address });
  console.log(`💰 Deployer balance: ${balance} wei\n`);

  if (balance < 1000000000000000n) { // Less than 0.001 ETH
    console.log('⚠️  WARNING: Deployer has low balance. May not be enough for gas.\n');
  }

  // Send 0.0005 ETH to new wallet for gas
  console.log('📤 Sending 0.0005 ETH to new wallet for gas...\n');
  const sendHash = await deployerWallet.sendTransaction({
    to: newAccount.address,
    value: 500000000000000n, // 0.0005 ETH
  });

  console.log(`   Transaction: ${sendHash}`);
  await publicClient.waitForTransactionReceipt({ hash: sendHash });
  console.log('   ✅ Funded!\n');

  // Now register worker with new wallet
  const newWallet = createWalletClient({
    account: newAccount,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  console.log('📤 Registering new worker...\n');
  const registerHash = await newWallet.writeContract({
    address: lendiProofAddress as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registerWorker',
  });

  console.log(`   Transaction: ${registerHash}`);
  console.log(`   Explorer: https://sepolia.arbiscan.io/tx/${registerHash}\n`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });

  console.log(`✅ Worker registered in block: ${receipt.blockNumber}\n`);
  console.log('🔔 QuickNode should now:');
  console.log('   1. Detect WorkerRegistered event');
  console.log('   2. Send webhook to backend');
  console.log('   3. Backend should return 200 OK\n');
  console.log('📊 Check:');
  console.log('   - QuickNode Dashboard → Webhook → Recent Deliveries');
  console.log('   - Vercel Logs → POST /api/v1/webhooks/quicknode → 200\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
