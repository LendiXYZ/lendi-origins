import { ethers } from 'ethers';

/**
 * Script para encontrar todos los escrows asociados a una wallet
 *
 * Busca eventos EscrowCreated en el contrato ConfidentialEscrow
 * y muestra información básica de cada uno
 *
 * Uso:
 * WALLET_ADDRESS=0x... npx tsx find-escrows.ts
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const ESCROW_CONTRACT = '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa';

// ABIs - ReinieraOS uses different event names
const ESCROW_ABI = [
  // Try multiple possible event signatures
  'event EscrowCreated(bytes32 indexed escrowId, address indexed owner, uint256 amount, address resolver)',
  'event VaultCreated(uint256 indexed id, address indexed owner, uint256 amount)',
  'event Created(uint256 indexed id, address indexed owner)',
  'function escrows(bytes32) view returns (address owner, uint256 amount, uint256 paidAmount, bool isRedeemed, address resolver, bytes resolverData)',
  'function vaults(uint256) view returns (address owner, uint256 amount, uint256 paidAmount, bool isRedeemed, address resolver, bytes resolverData)',
];

async function findEscrows() {
  console.log('\n🔍 Finding Escrows\n');
  console.log('═'.repeat(80));

  const walletAddress = process.env.WALLET_ADDRESS || '0xeD6fE6008D6bbCe64dCCAFBb3E03919ba684F83D';
  console.log(`\n📍 Wallet Address: ${walletAddress}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const escrow = new ethers.Contract(ESCROW_CONTRACT, ESCROW_ABI, provider);

  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log(`   Current Block: ${currentBlock}`);

  // Search for EscrowCreated events (last 100k blocks ~1 month)
  const fromBlock = Math.max(0, currentBlock - 100000);
  console.log(`   Searching from block: ${fromBlock}\n`);

  console.log('⏳ Fetching EscrowCreated events...');

  try {
    // Try to get ALL events (not filtered by type)
    const allLogs = await provider.getLogs({
      address: ESCROW_CONTRACT,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`   Found ${allLogs.length} total events\n`);

    if (allLogs.length === 0) {
      console.log('❌ No events found on this contract in the last 100k blocks');
      console.log('   The contract might be newer or use a different address\n');
      return;
    }

    // Group by topic (event signature)
    const eventsByTopic = new Map<string, number>();
    allLogs.forEach(log => {
      const topic = log.topics[0];
      eventsByTopic.set(topic, (eventsByTopic.get(topic) || 0) + 1);
    });

    console.log('Event types found:');
    eventsByTopic.forEach((count, topic) => {
      console.log(`   ${topic}: ${count} events`);
    });
    console.log();

    // Now try to parse events
    const events = allLogs.map(log => {
      try {
        return escrow.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
      } catch {
        return null;
      }
    }).filter(e => e !== null);

    console.log(`   Parsed ${events.length} events\n`);

    if (events.length === 0) {
      console.log('❌ No escrows found for this address');
      return;
    }

    let relevantEscrows = 0;

    // Check each escrow
    for (const event of events) {
      const escrowId = event.args?.escrowId as string;
      const owner = event.args?.owner as string;
      const amount = event.args?.amount as bigint;
      const resolver = event.args?.resolver as string;

      // Read full escrow state
      try {
        const [ownerEnc, amountFull, paidAmount, isRedeemed, resolverAddr, resolverData] =
          await escrow.escrows(escrowId);

        // Decode resolverData to check if worker matches our address
        let isRelevant = false;
        let workerAddr = '';
        let threshold = 0;

        if (resolverData && resolverData !== '0x' && resolverData.length >= 58) {
          // resolverData format: 20 bytes address + 8 bytes uint64
          workerAddr = '0x' + resolverData.slice(2, 42);
          const thresholdHex = resolverData.slice(42, 58);
          threshold = parseInt(thresholdHex, 16);

          if (workerAddr.toLowerCase() === walletAddress.toLowerCase()) {
            isRelevant = true;
            relevantEscrows++;
          }
        }

        if (isRelevant) {
          console.log(`\n📦 Escrow #${relevantEscrows}`);
          console.log('─'.repeat(80));
          console.log(`   Escrow ID:         ${escrowId}`);
          console.log(`   Worker (you):      ${workerAddr}`);
          console.log(`   Threshold:         ${threshold / 1_000_000} USDC`);
          console.log(`   Amount:            ${ethers.formatUnits(amountFull, 6)} cUSDC`);
          console.log(`   Paid Amount:       ${ethers.formatUnits(paidAmount, 6)} cUSDC`);
          console.log(`   Is Redeemed:       ${isRedeemed ? '✅ Yes' : '❌ No'}`);
          console.log(`   Resolver:          ${resolverAddr}`);
          console.log(`   Created Block:     ${event.blockNumber}`);
          console.log(`   Created TX:        https://sepolia.arbiscan.io/tx/${event.transactionHash}`);

          // Check if fully funded
          if (paidAmount < amountFull) {
            console.log(`\n   ⚠️  Status: NOT FULLY FUNDED`);
            console.log(`   Missing: ${ethers.formatUnits(amountFull - paidAmount, 6)} cUSDC`);
          } else if (isRedeemed) {
            console.log(`\n   ✅ Status: ALREADY REDEEMED`);
          } else {
            console.log(`\n   ✅ Status: READY TO CLAIM`);
          }
        }
      } catch (error: any) {
        console.log(`\n   ⚠️  Could not read escrow ${escrowId}: ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`✅ Found ${relevantEscrows} escrows for wallet ${walletAddress}\n`);

    if (relevantEscrows === 0) {
      console.log('💡 Note: No escrows found where you are the designated worker.');
      console.log('   This could mean:');
      console.log('   - No lender has created an escrow for you yet');
      console.log('   - The escrows were created with a different worker address');
      console.log('   - The escrows are outside the search range (last 100k blocks)\n');
    }

  } catch (error: any) {
    console.error(`\n❌ Error fetching events: ${error.message}`);
    if (error.code === 'CALL_EXCEPTION') {
      console.error('   This might be a rate limit issue. Try again in a moment.');
    }
  }
}

// Run
findEscrows()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
