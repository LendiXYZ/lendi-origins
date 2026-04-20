import { ethers } from 'ethers';

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';
const ESCROW_ID = 74;

const ABI = [
  'function escrowToWorker(uint256) view returns (address)',
  'function escrowToThreshold(uint256) view returns (uint64)',
  'function registeredLenders(address) view returns (bool)',
];

async function checkLinkage() {
  console.log('\n🔍 Checking Linkage On-Chain\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const lendiProof = new ethers.Contract(LENDI_PROOF, ABI, provider);

  console.log(`\n📍 LendiProof: ${LENDI_PROOF}`);
  console.log(`   Escrow ID: ${ESCROW_ID}`);

  // Try to read escrowToWorker
  console.log('\n1️⃣  Reading escrowToWorker(74)...');
  try {
    const worker = await lendiProof.escrowToWorker(ESCROW_ID);
    console.log(`   ✅ Worker: ${worker}`);

    if (worker === ethers.ZeroAddress) {
      console.log(`   ⚠️  WARNING: Worker is zero address (not linked!)`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Try to read escrowToThreshold
  console.log('\n2️⃣  Reading escrowToThreshold(74)...');
  try {
    const threshold = await lendiProof.escrowToThreshold(ESCROW_ID);
    console.log(`   ✅ Threshold: ${threshold.toString()} (${Number(threshold) / 1_000000} USDC)`);

    if (threshold === 0n) {
      console.log(`   ⚠️  WARNING: Threshold is zero (not linked!)`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Check if LendiProofGate is registered as lender
  console.log('\n3️⃣  Checking if LendiProofGate is registered as lender...');
  const LENDI_PROOF_GATE = '0x06b0523e63FF904d622aa6d125FdEe11201Bf791';

  try {
    const isLender = await lendiProof.registeredLenders(LENDI_PROOF_GATE);
    console.log(`   LendiProofGate is lender: ${isLender ? '✅ Yes' : '❌ No'}`);

    if (!isLender) {
      console.log(`\n   🎯 PROBLEM FOUND:`);
      console.log(`   LendiProofGate is NOT registered as lender!`);
      console.log(`   This would cause onConditionSet() → linkEscrow() to fail`);
      console.log(`\n   But EscrowLinked event WAS emitted, so this is confusing...`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('');
}

checkLinkage()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
