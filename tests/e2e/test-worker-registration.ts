import { ethers } from 'ethers';

/**
 * Script para probar el registro de worker (paso 2 del flujo completo)
 *
 * Requisitos:
 * - Wallet con ETH en Arbitrum Sepolia (para gas)
 * - Ya registrado como lender
 * - PRIVATE_KEY en variables de entorno
 *
 * Uso:
 * PRIVATE_KEY=0x... npx tsx test-worker-registration.ts
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';

// ABIs mínimas
const LENDI_PROOF_ABI = [
  'function registerWorker() external',
  'function registeredWorkers(address) view returns (bool)',
  'function registeredLenders(address) view returns (bool)',
  'function workers(address) view returns (bool isRegistered, uint256 totalIncome, uint256 proofCount)',
  'event WorkerRegistered(address indexed worker)',
];

async function testWorkerRegistration() {
  console.log('\n🧪 Testing Worker Registration\n');
  console.log('═'.repeat(80));

  // Setup
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY env variable is required');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();

  console.log(`\n📍 Wallet Address: ${address}`);

  const lendiProof = new ethers.Contract(LENDI_PROOF, LENDI_PROOF_ABI, wallet);

  // 1. Check current status
  console.log('\n1️⃣  Checking current status...');

  const ethBalance = await provider.getBalance(address);
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  const isLender = await lendiProof.registeredLenders(address);
  console.log(`   Lender: ${isLender ? '✅ Registered' : '❌ Not registered'}`);

  const isWorker = await lendiProof.registeredWorkers(address);
  console.log(`   Worker: ${isWorker ? '✅ Already registered' : '❌ Not registered'}`);

  if (isWorker) {
    console.log('\n✅ Already registered as worker!');

    // Show worker info
    const [workerRegistered, totalIncome, proofCount] = await lendiProof.workers(address);
    console.log(`\n   Worker Info:`);
    console.log(`   - Registered: ${workerRegistered}`);
    console.log(`   - Total Income (encrypted): ${totalIncome.toString()}`);
    console.log(`   - Proof Count: ${proofCount.toString()}`);
    return;
  }

  // 2. Register as worker
  console.log('\n2️⃣  Registering as worker...');
  console.log('   Calling LendiProof.registerWorker()...');

  const registerTx = await lendiProof.registerWorker();
  console.log(`   Register tx: ${registerTx.hash}`);
  console.log('   Waiting for confirmation...');

  const registerReceipt = await registerTx.wait();
  console.log(`   ✅ Registered! (Block: ${registerReceipt.blockNumber})`);

  // Parse events
  for (const log of registerReceipt.logs) {
    try {
      const parsed = lendiProof.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'WorkerRegistered') {
        console.log(`\n   📢 Event: WorkerRegistered`);
        console.log(`      Worker: ${parsed.args.worker}`);
      }
    } catch (e) {
      // Skip logs that don't match
    }
  }

  // 3. Verify registration
  console.log('\n3️⃣  Verifying registration...');
  const isNowRegistered = await lendiProof.registeredWorkers(address);
  console.log(`   Worker Registered: ${isNowRegistered ? '✅ Yes' : '❌ No'}`);

  // 4. Get worker info
  console.log('\n4️⃣  Worker info...');
  const [workerRegistered, totalIncome, proofCount] = await lendiProof.workers(address);
  console.log(`   - Registered: ${workerRegistered}`);
  console.log(`   - Total Income (encrypted): ${totalIncome.toString()}`);
  console.log(`   - Proof Count: ${proofCount.toString()}`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Worker registration completed successfully!\\n');
  console.log(`🔍 Verify on Arbiscan:`);
  console.log(`   https://sepolia.arbiscan.io/address/${address}\\n`);
}

// Run
testWorkerRegistration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Data:', error.data);
    }
    process.exit(1);
  });
