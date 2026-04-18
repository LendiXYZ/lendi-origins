#!/usr/bin/env tsx
/**
 * Register Backend Signer as Lender
 *
 * This script registers the backend signer address as a lender in LendiProof contract.
 * This is CRITICAL - without this, backend cannot call onlyLender functions like linkEscrow.
 *
 * Usage:
 *   tsx scripts/register-backend-signer.ts
 *
 * Requirements:
 *   - SIGNER_PRIVATE_KEY in .env (deployer/owner wallet)
 *   - LENDI_PROOF_ADDRESS in .env
 *   - RPC_URL in .env
 */

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { getEnv } from '../src/core/config.js';

const LENDI_PROOF_ABI = parseAbi([
  'function registerLenderByOwner(address lender) external',
  'function registeredLenders(address) view returns (bool)',
  'function owner() view returns (address)',
]);

async function main() {
  console.log('🔧 Registering Backend Signer as Lender in LendiProof\n');

  // Load environment configuration
  const config = getEnv();

  // Validate environment
  if (!config.SIGNER_PRIVATE_KEY) {
    throw new Error('SIGNER_PRIVATE_KEY not found in environment');
  }
  if (!config.LENDI_PROOF_ADDRESS) {
    throw new Error('LENDI_PROOF_ADDRESS not found in environment');
  }

  // Setup clients
  const account = privateKeyToAccount(config.SIGNER_PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(config.RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(config.RPC_URL),
  });

  console.log('📋 Configuration:');
  console.log(`   Signer Address:     ${account.address}`);
  console.log(`   LendiProof:         ${config.LENDI_PROOF_ADDRESS}`);
  console.log(`   Network:            Arbitrum Sepolia (${arbitrumSepolia.id})`);
  console.log(`   RPC:                ${config.RPC_URL}\n`);

  // Get contract owner
  const owner = await publicClient.readContract({
    address: config.LENDI_PROOF_ADDRESS as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'owner',
  });

  console.log(`   Contract Owner:     ${owner}\n`);

  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    console.warn('⚠️  WARNING: Signer is not the contract owner!');
    console.warn('   Only the owner can register lenders.');
    console.warn('   Make sure you are using the deployer/owner private key.\n');
  }

  // Check if already registered
  const isAlreadyRegistered = await publicClient.readContract({
    address: config.LENDI_PROOF_ADDRESS as Address,
    abi: LENDI_PROOF_ABI,
    functionName: 'registeredLenders',
    args: [account.address],
  });

  if (isAlreadyRegistered) {
    console.log('✅ Backend signer is ALREADY registered as lender');
    console.log('   No action needed.\n');
    return;
  }

  console.log('❌ Backend signer is NOT registered as lender');
  console.log('   Proceeding with registration...\n');

  // Register lender
  try {
    const hash = await walletClient.writeContract({
      address: config.LENDI_PROOF_ADDRESS as Address,
      abi: LENDI_PROOF_ABI,
      functionName: 'registerLenderByOwner',
      args: [account.address],
    });

    console.log('📤 Transaction sent:');
    console.log(`   Hash: ${hash}`);
    console.log('   Waiting for confirmation...\n');

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ SUCCESS! Backend signer registered as lender');
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed}\n`);

      // Verify registration
      const isNowRegistered = await publicClient.readContract({
        address: config.LENDI_PROOF_ADDRESS as Address,
        abi: LENDI_PROOF_ABI,
        functionName: 'registeredLenders',
        args: [account.address],
      });

      if (isNowRegistered) {
        console.log('✅ Verification: Backend signer is confirmed as registered lender\n');
        console.log('🎉 Backend is now ready to create loans!\n');
      } else {
        console.error('❌ Verification failed: Backend signer not showing as registered');
        console.error('   Please check transaction and try again.\n');
        process.exit(1);
      }
    } else {
      console.error('❌ Transaction failed (reverted)');
      console.error(`   Status: ${receipt.status}\n`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error registering lender:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('OwnableUnauthorizedAccount')) {
      console.error('💡 Tip: Make sure you are using the contract owner private key');
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
