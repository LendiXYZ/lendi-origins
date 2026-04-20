import { ethers } from 'ethers';

/**
 * Verificar si requestVerification() y publishVerification() fueron ejecutados
 * para el escrow 74
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF_GATE = '0x06b0523e63FF904d622aa6d125FdEe11201Bf791';
const ESCROW_ID = 74;

const ABI = [
  'function getEncryptedHandle(uint256 escrowId) view returns (tuple(bytes32))',
  'function isConditionMet(uint256 escrowId) view returns (bool)',
  'event VerificationRequested(uint256 indexed escrowId, address indexed worker, uint64 threshold)',
  'event VerificationPublished(uint256 indexed escrowId, bool result)',
];

async function checkFHEVerification() {
  console.log('\n🔍 Checking FHE Verification State for Escrow 74\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const gate = new ethers.Contract(LENDI_PROOF_GATE, ABI, provider);

  console.log(`\n📍 LendiProofGate: ${LENDI_PROOF_GATE}`);
  console.log(`   Escrow ID: ${ESCROW_ID}`);

  // 1. Check if there's an encrypted handle (indicates requestVerification was called)
  console.log('\n1️⃣  Checking for encrypted handle (requestVerification)...');
  try {
    const handle = await gate.getEncryptedHandle(ESCROW_ID);
    const handleBytes = handle[0]; // tuple returns as array
    console.log(`   Encrypted Handle: ${handleBytes}`);

    if (handleBytes === ethers.ZeroHash) {
      console.log(`   ❌ Handle is zero - requestVerification() NOT called`);
    } else {
      console.log(`   ✅ Handle exists - requestVerification() WAS called`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 2. Try isConditionMet (will revert if verification not complete)
  console.log('\n2️⃣  Checking isConditionMet()...');
  try {
    const isMet = await gate.isConditionMet(ESCROW_ID);
    console.log(`   ✅ Condition Met: ${isMet ? 'TRUE' : 'FALSE'}`);
    console.log(`   This means publishVerification() WAS called successfully`);

    if (!isMet) {
      console.log(`\n   ⚠️  Worker income does NOT meet threshold`);
      console.log(`   Cannot claim escrow - need to record more income`);
    }
  } catch (e: any) {
    console.log(`   ❌ isConditionMet() reverted: ${e.message.split('(')[0]}`);

    if (e.message.includes('EscrowNotLinked')) {
      console.log(`   Error: EscrowNotLinked - escrow not linked to worker`);
    } else if (e.message.includes('NoVerificationRequested')) {
      console.log(`   Error: NoVerificationRequested - requestVerification() not called`);
    } else if (e.message.includes('VerificationNotReady')) {
      console.log(`   Error: VerificationNotReady - publishVerification() not called`);
    }
  }

  // 3. Search for VerificationRequested events
  console.log('\n3️⃣  Searching for VerificationRequested events...');
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100000);

  const reqFilter = gate.filters.VerificationRequested(ESCROW_ID);
  const reqEvents = await gate.queryFilter(reqFilter, fromBlock, currentBlock);

  console.log(`   Found ${reqEvents.length} VerificationRequested events`);
  for (const event of reqEvents) {
    console.log(`     Block: ${event.blockNumber}, TX: ${event.transactionHash}`);
  }

  // 4. Search for VerificationPublished events
  console.log('\n4️⃣  Searching for VerificationPublished events...');
  const pubFilter = gate.filters.VerificationPublished(ESCROW_ID);
  const pubEvents = await gate.queryFilter(pubFilter, fromBlock, currentBlock);

  console.log(`   Found ${pubEvents.length} VerificationPublished events`);
  for (const event of pubEvents) {
    console.log(`     Block: ${event.blockNumber}, TX: ${event.transactionHash}`);
    console.log(`     Result: ${event.args?.result ? '✅ TRUE' : '❌ FALSE'}`);
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 VERIFICATION FLOW STATUS\n');

  const hasRequestEvent = reqEvents.length > 0;
  const hasPublishEvent = pubEvents.length > 0;

  console.log(`Step 1 - requestVerification():  ${hasRequestEvent ? '✅ Done' : '❌ Missing'}`);
  console.log(`Step 2 - publishVerification():  ${hasPublishEvent ? '✅ Done' : '❌ Missing'}`);

  if (!hasRequestEvent) {
    console.log(`\n🎯 ROOT CAUSE:`);
    console.log(`   requestVerification() was NEVER called for escrow 74`);
    console.log(`\n💡 SOLUTION:`);
    console.log(`   Backend should call LendiProofGate.requestVerification(74)`);
    console.log(`   This is step 3 in create-loan.use-case.ts (line 74)`);
  } else if (!hasPublishEvent) {
    console.log(`\n🎯 ROOT CAUSE:`);
    console.log(`   publishVerification() was NEVER called for escrow 74`);
    console.log(`\n💡 SOLUTION:`);
    console.log(`   Backend should:`);
    console.log(`   1. Get encrypted handle with getEncryptedHandle(74)`);
    console.log(`   2. Decrypt with CoFHE SDK: decryptForTx(handle)`);
    console.log(`   3. Call publishVerification(74, result, signature)`);
  }

  console.log('');
}

checkFHEVerification()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
