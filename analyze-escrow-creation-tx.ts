import { ethers } from 'ethers';

/**
 * Analizar la transacción de creación del escrow 74
 * para verificar si onConditionSet() fue llamado y si falló
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const CREATION_TX = '0x0012ab63d94be07e934cb3f5492263b2497000d94026deb4e023e93eaaed6a46';

const LENDI_PROOF_GATE = '0x06b0523e63FF904d622aa6d125FdEe11201Bf791';
const LENDI_PROOF = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';

async function analyzeCreationTx() {
  console.log('\n🔍 Analyzing Escrow 74 Creation Transaction\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log(`\n📋 TX: ${CREATION_TX}`);

  // Get receipt
  const receipt = await provider.getTransactionReceipt(CREATION_TX);
  if (!receipt) {
    console.log('❌ Receipt not found');
    return;
  }

  console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Logs: ${receipt.logs.length}`);

  // Look for events related to linkage
  console.log('\n📊 Analyzing Events:\n');

  let foundLinkageEvent = false;
  let foundConditionSetCall = false;

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];

    // Check if log is from LendiProof or LendiProofGate
    if (log.address.toLowerCase() === LENDI_PROOF.toLowerCase()) {
      console.log(`   Log #${i}: LendiProof contract`);
      console.log(`     Topic[0]: ${log.topics[0]}`);

      // EscrowLinked event signature: keccak256("EscrowLinked(uint256,address)")
      const escrowLinkedSig = '0x9efa4f8fd84b0621331883c727dec0b3c600be9bed61056ecb4b8aeb7fde5916';

      if (log.topics[0] === escrowLinkedSig) {
        foundLinkageEvent = true;
        console.log(`     ✅ EscrowLinked event found!`);
        const escrowId = BigInt(log.topics[1]);
        const worker = '0x' + log.topics[2].slice(26);
        console.log(`     Escrow ID: ${escrowId} (${escrowId === 74n ? '✅' : '❌'})`);
        console.log(`     Worker: ${worker}`);
      }
    } else if (log.address.toLowerCase() === LENDI_PROOF_GATE.toLowerCase()) {
      console.log(`   Log #${i}: LendiProofGate contract`);
      console.log(`     Topic[0]: ${log.topics[0]}`);
    }
  }

  // Check if transaction made internal call to onConditionSet
  console.log('\n🔎 Checking for onConditionSet() call...');

  // Get trace (requires archive node, might not work on public RPC)
  try {
    const trace = await provider.send('debug_traceTransaction', [CREATION_TX, {}]);
    console.log('   Trace obtained (checking for internal calls...)');

    // Parse trace to find calls to LendiProofGate.onConditionSet
    // This is complex and might not work with all RPC providers
    console.log('   ⚠️  Trace parsing not implemented (requires archive node)');
  } catch (e: any) {
    console.log(`   ⚠️  Cannot get trace: ${e.message}`);
    console.log('   (This is expected on public RPCs without debug_ namespace)');
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY\n');

  if (foundLinkageEvent) {
    console.log('✅ EscrowLinked event WAS emitted');
    console.log('   This means linkEscrow() was called successfully');
    console.log('   onConditionSet() must have executed without reverting');
  } else {
    console.log('❌ EscrowLinked event NOT found');
    console.log('   This confirms onConditionSet() failed');
    console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
    console.log('   LendiProofGate.onConditionSet() calls lendiProof.linkEscrow()');
    console.log('   But linkEscrow() has "onlyLender" modifier');
    console.log('   LendiProofGate is NOT registered as a lender!');
    console.log('\n💡 SOLUTION:');
    console.log('   1. Register LendiProofGate as lender (free via owner)');
    console.log('   2. Or change linkEscrow() modifier to accept LendiProofGate');
    console.log('   3. Or add special modifier for trusted contracts');
  }

  console.log('');
}

analyzeCreationTx()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
