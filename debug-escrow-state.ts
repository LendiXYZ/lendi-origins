import { ethers } from 'ethers';

/**
 * Script para debuggear el estado de un escrow y verificar por qué falla el redeem
 *
 * Uso:
 * ESCROW_ID=0x... npx tsx debug-escrow-state.ts
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const ESCROW_CONTRACT = '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa';
const PROOF_GATE = '0x06b0523e63FF904d622aa6d125FdEe11201Bf791';
const LENDI_PROOF = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';

// ABIs mínimas
const ESCROW_ABI = [
  'function escrows(bytes32) view returns (address owner, uint256 amount, uint256 paidAmount, bool isRedeemed, address resolver, bytes resolverData)',
  'function getEscrowState(bytes32 escrowId) view returns (tuple(address owner, uint256 amount, uint256 paidAmount, bool isRedeemed, address resolver, bytes resolverData))',
];

const PROOF_GATE_ABI = [
  'function isConditionMet(bytes32 escrowId) view returns (bool)',
  'function escrowConditions(bytes32) view returns (address worker, uint256 threshold, bytes32 ctHash, bool hasResult, bool result)',
  'function getEncryptedHandle(bytes32 escrowId) view returns (bytes32)',
];

const LENDI_PROOF_ABI = [
  'function escrowLinks(bytes32) view returns (address worker, uint256 threshold)',
  'function registeredWorkers(address) view returns (bool)',
];

async function debugEscrowState() {
  console.log('\n🔍 Debugging Escrow State\n');
  console.log('═'.repeat(80));

  const escrowId = process.env.ESCROW_ID;
  if (!escrowId) {
    throw new Error('ESCROW_ID env variable is required');
  }

  console.log(`\n📍 Escrow ID: ${escrowId}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const escrow = new ethers.Contract(ESCROW_CONTRACT, ESCROW_ABI, provider);
  const gate = new ethers.Contract(PROOF_GATE, PROOF_GATE_ABI, provider);
  const proof = new ethers.Contract(LENDI_PROOF, LENDI_PROOF_ABI, provider);

  // 1. Estado del Escrow
  console.log('\n1️⃣  Escrow Contract State...');
  try {
    const [owner, amount, paidAmount, isRedeemed, resolver, resolverData] = await escrow.escrows(escrowId);

    console.log(`   Owner (encrypted):    ${owner}`);
    console.log(`   Amount:               ${ethers.formatUnits(amount, 6)} cUSDC`);
    console.log(`   Paid Amount:          ${ethers.formatUnits(paidAmount, 6)} cUSDC`);
    console.log(`   Is Redeemed:          ${isRedeemed ? '✅ Yes (already claimed)' : '❌ No'}`);
    console.log(`   Resolver:             ${resolver}`);
    console.log(`   Resolver Data:        ${resolverData}`);

    if (resolver.toLowerCase() !== PROOF_GATE.toLowerCase()) {
      console.log(`   ⚠️  WARNING: Resolver is not LendiProofGate!`);
    }

    if (isRedeemed) {
      console.log('\n   ❌ ERROR: Escrow already redeemed! Cannot claim twice.');
      return;
    }

    if (paidAmount < amount) {
      console.log(`\n   ⚠️  WARNING: Escrow not fully funded!`);
      console.log(`   Missing: ${ethers.formatUnits(amount - paidAmount, 6)} cUSDC`);
    }

    // Decode resolverData (packed: address worker + uint64 threshold)
    if (resolverData && resolverData !== '0x') {
      try {
        // resolverData should be 28 bytes: 20 bytes address + 8 bytes uint64
        const workerAddress = '0x' + resolverData.slice(2, 42);
        const thresholdHex = resolverData.slice(42, 58);
        const threshold = parseInt(thresholdHex, 16);

        console.log(`\n   Decoded Resolver Data:`);
        console.log(`     Worker Address: ${workerAddress}`);
        console.log(`     Threshold:      ${threshold / 1_000_000} USDC`);
      } catch (e) {
        console.log(`\n   ⚠️  Could not decode resolver data`);
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading escrow: ${error.message}`);
  }

  // 2. Estado en LendiProofGate
  console.log('\n2️⃣  LendiProofGate State...');
  try {
    const [worker, threshold, ctHash, hasResult, result] = await gate.escrowConditions(escrowId);

    console.log(`   Worker:               ${worker}`);
    console.log(`   Threshold:            ${threshold.toString()} (${Number(threshold) / 1_000_000} USDC)`);
    console.log(`   CT Hash (FHE):        ${ctHash}`);
    console.log(`   Has Result:           ${hasResult ? '✅ Yes' : '❌ No (need publishVerification)'}`);
    console.log(`   Result:               ${hasResult ? (result ? '✅ Condition MET' : '❌ Condition NOT MET') : 'N/A'}`);

    if (worker === ethers.ZeroAddress) {
      console.log(`\n   ⚠️  WARNING: Worker address is zero! Escrow may not be linked.`);
    }

    // Try isConditionMet
    console.log('\n   Checking isConditionMet...');
    try {
      const isMet = await gate.isConditionMet(escrowId);
      console.log(`   isConditionMet():     ${isMet ? '✅ TRUE' : '❌ FALSE'}`);
    } catch (error: any) {
      console.log(`   isConditionMet():     ❌ REVERTED`);
      console.log(`   Revert reason:        ${error.message}`);

      if (error.message.includes('EscrowNotLinked')) {
        console.log(`\n   💡 Solution: Lender must call linkEscrow()`);
      } else if (error.message.includes('NoVerificationRequested')) {
        console.log(`\n   💡 Solution: Worker must call requestVerification()`);
      } else if (error.message.includes('VerificationNotReady')) {
        console.log(`\n   💡 Solution: Worker must call publishVerification()`);
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading gate: ${error.message}`);
  }

  // 3. Estado en LendiProof (linkage)
  console.log('\n3️⃣  LendiProof Linkage...');
  try {
    const [linkedWorker, linkedThreshold] = await proof.escrowLinks(escrowId);

    console.log(`   Linked Worker:        ${linkedWorker}`);
    console.log(`   Linked Threshold:     ${linkedThreshold.toString()} (${Number(linkedThreshold) / 1_000_000} USDC)`);

    if (linkedWorker === ethers.ZeroAddress) {
      console.log(`\n   ❌ ERROR: Escrow NOT linked to any worker!`);
      console.log(`   This will cause requestVerification to fail.`);
      console.log(`   💡 Solution: Lender must call LendiProof.linkEscrow(escrowId, workerAddress, threshold)`);
    } else {
      console.log(`   ✅ Escrow is linked`);

      // Check if worker is registered
      const isRegistered = await proof.registeredWorkers(linkedWorker);
      console.log(`   Worker Registered:    ${isRegistered ? '✅ Yes' : '❌ No'}`);

      if (!isRegistered) {
        console.log(`\n   ⚠️  WARNING: Linked worker is not registered!`);
        console.log(`   Worker must call registerWorker() first.`);
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading proof: ${error.message}`);
  }

  // 4. Summary
  console.log('\n' + '═'.repeat(80));
  console.log('✅ Debug complete!\n');
  console.log('📊 Summary of Issues:');
  console.log('   Check the output above for ❌ and ⚠️  markers\n');
}

// Run
debugEscrowState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
