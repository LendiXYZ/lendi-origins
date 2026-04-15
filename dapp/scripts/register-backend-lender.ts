/**
 * Register Backend Signer as Lender
 *
 * Run this script from the dapp/contracts folder to register the backend signer
 * as a lender in LendiProof contract.
 *
 * Usage:
 *   npx hardhat run scripts/register-backend-lender.ts --network arbitrumSepolia
 *
 * Make sure to set BACKEND_SIGNER_ADDRESS in .env
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('\n🔧 Registering Backend Signer as Lender in LendiProof\n');

  // Get backend signer address from env
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;
  if (!backendSignerAddress) {
    throw new Error('BACKEND_SIGNER_ADDRESS not set in .env');
  }

  // Get deployed contract address
  const lendiProofAddress = process.env.LENDI_PROOF_ADDRESS;
  if (!lendiProofAddress) {
    throw new Error('LENDI_PROOF_ADDRESS not set in .env');
  }

  console.log('📋 Configuration:');
  console.log(`   Backend Signer:     ${backendSignerAddress}`);
  console.log(`   LendiProof:         ${lendiProofAddress}`);
  console.log(`   Network:            ${(await ethers.provider.getNetwork()).name}\n`);

  // Get contract instance
  const LendiProof = await ethers.getContractAt('LendiProof', lendiProofAddress);

  // Check if already registered
  const isAlreadyRegistered = await LendiProof.registeredLenders(backendSignerAddress);

  if (isAlreadyRegistered) {
    console.log('✅ Backend signer is ALREADY registered as lender');
    console.log('   No action needed.\n');
    return;
  }

  console.log('❌ Backend signer is NOT registered as lender');
  console.log('   Proceeding with registration...\n');

  // Register lender
  const tx = await LendiProof.registerLenderByOwner(backendSignerAddress);
  console.log('📤 Transaction sent:');
  console.log(`   Hash: ${tx.hash}`);
  console.log('   Waiting for confirmation...\n');

  const receipt = await tx.wait();
  console.log('✅ SUCCESS! Backend signer registered as lender');
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed}\n`);

  // Verify registration
  const isNowRegistered = await LendiProof.registeredLenders(backendSignerAddress);
  if (isNowRegistered) {
    console.log('✅ Verification: Backend signer is confirmed as registered lender\n');
    console.log('🎉 Backend is now ready to create loans!\n');
  } else {
    console.error('❌ Verification failed: Backend signer not showing as registered\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
