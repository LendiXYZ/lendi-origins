import { ethers } from 'ethers';

/**
 * Script para verificar si el escrow ID 74 existe on-chain
 * y obtener información sobre el contador de escrows
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const ESCROW_CONTRACT = '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa';
const ESCROW_ID = 74;

// Posibles ABIs para verificar existencia
const ESCROW_ABI = [
  // Verificar si existe un getter de contador
  'function nextId() view returns (uint256)',
  'function escrowCount() view returns (uint256)',
  'function totalEscrows() view returns (uint256)',
  'function escrowIds(uint256) view returns (uint256)',

  // Verificar si existe método exists()
  'function exists(uint256) view returns (bool)',

  // Getter estándar del mapping
  'function escrows(uint256) view returns (address owner, uint256 amount, uint256 paidAmount, bool isRedeemed, address resolver, bytes resolverData)',

  // Eventos
  'event EscrowCreated(uint256 indexed escrowId, address indexed owner, uint256 amount, address resolver)',
  'event Created(uint256 indexed id)',
  'event VaultCreated(uint256 indexed id, address indexed owner)',
];

async function verifyEscrowExists() {
  console.log('\n🔍 Verifying Escrow Existence On-Chain\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const escrow = new ethers.Contract(ESCROW_CONTRACT, ESCROW_ABI, provider);

  console.log(`\n📍 Contract: ${ESCROW_CONTRACT}`);
  console.log(`   Escrow ID: ${ESCROW_ID}`);

  // 1. Try to get escrow counter/nextId
  console.log('\n1️⃣  Checking escrow counter...');

  const counterMethods = ['nextId', 'escrowCount', 'totalEscrows'];
  let counter: bigint | null = null;

  for (const method of counterMethods) {
    try {
      counter = await escrow[method]();
      console.log(`   ✅ ${method}() = ${counter.toString()}`);
      break;
    } catch (e) {
      console.log(`   ⚠️  ${method}() not available`);
    }
  }

  if (counter !== null) {
    if (BigInt(ESCROW_ID) >= counter) {
      console.log(`\n   ❌ PROBLEM: Escrow ID ${ESCROW_ID} is >= counter ${counter}`);
      console.log(`   This means the escrow was never created!`);
      console.log(`   Only escrows 0-${Number(counter) - 1} exist.`);
    } else {
      console.log(`\n   ✅ Escrow ID ${ESCROW_ID} is within valid range (0-${Number(counter) - 1})`);
    }
  } else {
    console.log('\n   ⚠️  Could not determine escrow counter');
  }

  // 2. Try exists() method if available
  console.log('\n2️⃣  Checking exists() method...');
  try {
    const exists = await escrow.exists(ESCROW_ID);
    console.log(`   exists(${ESCROW_ID}) = ${exists ? '✅ true' : '❌ false'}`);

    if (!exists) {
      console.log(`\n   ❌ CONFIRMED: Escrow ${ESCROW_ID} does NOT exist on-chain!`);
    }
  } catch (e: any) {
    console.log(`   ⚠️  exists() method not available: ${e.message}`);
  }

  // 3. Try to read escrow data directly
  console.log('\n3️⃣  Attempting to read escrow data...');
  try {
    const [owner, amount, paidAmount, isRedeemed, resolver, resolverData] =
      await escrow.escrows(ESCROW_ID);

    console.log(`   ✅ Escrow data found:`);
    console.log(`      Owner (encrypted): ${owner}`);
    console.log(`      Amount: ${ethers.formatUnits(amount, 6)} cUSDC`);
    console.log(`      Paid: ${ethers.formatUnits(paidAmount, 6)} cUSDC`);
    console.log(`      Redeemed: ${isRedeemed}`);
    console.log(`      Resolver: ${resolver}`);
    console.log(`      Resolver Data: ${resolverData}`);

    // Check if this is a valid escrow (non-zero data)
    if (owner === ethers.ZeroAddress && amount === 0n) {
      console.log(`\n   ⚠️  WARNING: All values are zero/empty`);
      console.log(`   This likely means the escrow slot is uninitialized (never created)`);
    }
  } catch (e: any) {
    console.log(`   ❌ Cannot read escrow data: ${e.message}`);
    if (e.message.includes('require(false)') || e.message.includes('execution reverted')) {
      console.log(`\n   ❌ CONFIRMED: Escrow ${ESCROW_ID} does NOT exist!`);
      console.log(`   The contract explicitly reverted, meaning this ID was never created.`);
    }
  }

  // 4. Search for EscrowCreated events for this ID
  console.log('\n4️⃣  Searching for EscrowCreated events...');

  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100000); // Last ~1 month

  console.log(`   Searching blocks ${fromBlock} to ${currentBlock}...`);

  try {
    // Get all logs from the contract
    const logs = await provider.getLogs({
      address: ESCROW_CONTRACT,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`   Found ${logs.length} total events`);

    // Try to find events that contain our escrow ID
    let foundEvent = false;

    for (const log of logs) {
      // Check if escrowId appears in topics (indexed parameter)
      const escrowIdHex = ethers.zeroPadValue(ethers.toBeHex(ESCROW_ID), 32);

      if (log.topics.some(topic => topic.toLowerCase() === escrowIdHex.toLowerCase())) {
        console.log(`\n   ✅ Found event with escrow ID ${ESCROW_ID}:`);
        console.log(`      Block: ${log.blockNumber}`);
        console.log(`      TX: ${log.transactionHash}`);
        console.log(`      Topics: ${log.topics.join(', ')}`);
        foundEvent = true;
      }
    }

    if (!foundEvent) {
      console.log(`\n   ❌ No events found for escrow ID ${ESCROW_ID}`);
      console.log(`   This confirms the escrow was never created.`);
    }

  } catch (error: any) {
    console.error(`   ❌ Error searching events: ${error.message}`);
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Escrow ID ${ESCROW_ID} verification complete.`);
  console.log(`\nIf all checks above show the escrow doesn't exist, this means:`);
  console.log(`1. The frontend/backend stored an incorrect ID`);
  console.log(`2. The escrow creation transaction failed/reverted`);
  console.log(`3. There's a mismatch between expected and actual escrow ID`);
  console.log(`\n💡 Next step: Check the transaction hash from when the escrow was created`);
  console.log(`   to see if it actually emitted an EscrowCreated event with a different ID.\n`);
}

// Run
verifyEscrowExists()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
