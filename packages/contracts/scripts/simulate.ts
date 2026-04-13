import hre from 'hardhat';
import { Encryptable } from '@cofhe/sdk/node';

/**
 * End-to-end simulation script
 *
 * Steps:
 * 1. Register worker
 * 2. Record 4 weekly incomes (simulate 4 payments of $100 each = $400/month)
 * 3. Call proveIncome with threshold $300 → expect true
 * 4. Call proveIncome with threshold $500 → expect false
 * 5. Link an escrow and call isConditionMet via the gate
 * 6. Log each step with tx hash for verification on Arbiscan
 */

async function main() {
  console.log('=== InformalProof End-to-End Simulation ===\n');

  const [deployer, worker] = await hre.ethers.getSigners();

  // Get deployed contract addresses (update these after deployment)
  const INFORMALPROOF_ADDRESS = process.env.INFORMALPROOF_ADDRESS || '';
  const GATE_ADDRESS = process.env.GATE_ADDRESS || '';

  if (!INFORMALPROOF_ADDRESS || !GATE_ADDRESS) {
    console.error('Error: Please set INFORMALPROOF_ADDRESS and GATE_ADDRESS in .env');
    process.exit(1);
  }

  const informalProof = await hre.ethers.getContractAt('InformalProof', INFORMALPROOF_ADDRESS);
  const gate = await hre.ethers.getContractAt('InformalProofGate', GATE_ADDRESS);

  console.log('Contract addresses:');
  console.log('InformalProof:', INFORMALPROOF_ADDRESS);
  console.log('InformalProofGate:', GATE_ADDRESS);
  console.log('Worker:', worker.address);
  console.log('Deployer (lender):', deployer.address);
  console.log();

  // Create CoFHE client for encrypting inputs
  const cofheClient = await hre.cofhe.createClientWithBatteries(worker);

  // ============================================
  // STEP 1: Register Worker
  // ============================================
  console.log('Step 1: Registering worker...');
  const registerTx = await informalProof.connect(worker).registerWorker();
  const registerReceipt = await registerTx.wait();
  console.log('✓ Worker registered');
  console.log('  Tx hash:', registerReceipt?.hash);
  console.log();

  // ============================================
  // STEP 2: Record 4 Weekly Incomes ($100 each)
  // ============================================
  console.log('Step 2: Recording 4 weekly incomes of $100 each...');
  const weeklyIncome = 100_000000n; // $100 USDC

  for (let week = 1; week <= 4; week++) {
    console.log(`  Week ${week}: Recording $100...`);
    const [encAmount] = await cofheClient
      .encryptInputs([Encryptable.uint64(weeklyIncome)])
      .execute();

    const recordTx = await informalProof.connect(worker).recordIncome(encAmount);
    const recordReceipt = await recordTx.wait();
    console.log(`  ✓ Recorded | Tx hash: ${recordReceipt?.hash}`);
  }
  console.log('✓ Total income recorded: $400');
  console.log();

  // ============================================
  // STEP 3: Prove Income with $300 Threshold (should pass)
  // ============================================
  console.log('Step 3: Testing income proof with $300 threshold (should qualify)...');
  const threshold300 = 300_000000n;
  const proof300Tx = await informalProof.connect(deployer).proveIncome(worker.address, threshold300);
  const proof300Receipt = await proof300Tx.wait();
  console.log('✓ Proof requested for $300 threshold');
  console.log('  Tx hash:', proof300Receipt?.hash);
  console.log('  Expected result: QUALIFIES (income $400 >= threshold $300)');
  console.log();

  // ============================================
  // STEP 4: Prove Income with $500 Threshold (should fail)
  // ============================================
  console.log('Step 4: Testing income proof with $500 threshold (should NOT qualify)...');
  const threshold500 = 500_000000n;
  const proof500Tx = await informalProof.connect(deployer).proveIncome(worker.address, threshold500);
  const proof500Receipt = await proof500Tx.wait();
  console.log('✓ Proof requested for $500 threshold');
  console.log('  Tx hash:', proof500Receipt?.hash);
  console.log('  Expected result: DOES NOT QUALIFY (income $400 < threshold $500)');
  console.log();

  // ============================================
  // STEP 5: Link Escrow and Test Gate
  // ============================================
  console.log('Step 5: Linking escrow and testing gate condition...');
  const escrowId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('simulation-escrow-1'));
  const escrowThreshold = 300_000000n; // $300

  console.log('  Linking escrow with $300 threshold...');
  const linkTx = await informalProof.connect(deployer).linkEscrow(
    escrowId,
    worker.address,
    escrowThreshold
  );
  const linkReceipt = await linkTx.wait();
  console.log('  ✓ Escrow linked | Tx hash:', linkReceipt?.hash);

  console.log('  Checking condition via gate...');
  const conditionTx = await gate.isConditionMet(escrowId);
  console.log('  ✓ Condition checked');
  console.log('  Result:', conditionTx ? 'CONDITION MET ✓' : 'CONDITION NOT MET ✗');
  console.log();

  // ============================================
  // SUMMARY
  // ============================================
  console.log('=== Simulation Complete ===');
  console.log('\nVerify on Arbiscan:');
  console.log(`https://sepolia.arbiscan.io/address/${INFORMALPROOF_ADDRESS}`);
  console.log('\nCheck that:');
  console.log('- WorkerRegistered event is visible');
  console.log('- 4 IncomeRecorded events are visible (timestamps only, NO amounts)');
  console.log('- 2 ProofRequested events are visible (addresses only, NO amounts)');
  console.log('- EscrowLinked event is visible');
  console.log('- NO income amounts are visible anywhere on-chain');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
