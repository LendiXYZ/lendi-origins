import { ethers } from 'ethers';

/**
 * Script para extraer el Escrow ID de la transacción fallida
 *
 * La transacción failed claim contiene el escrowId en el calldata
 * Este script decodifica la data para extraer el escrowId
 *
 * Uso:
 * npx tsx extract-escrow-from-tx.ts
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const TX_HASH = '0xb6649d581a3f908fc0d51731beefbf8bc836a52769184d7fe96b46255d053012';

// EntryPoint UserOperation event
const ENTRY_POINT_ABI = [
  'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)',
];

// ERC-4337 execute and executeUserOp selectors
const EXECUTE_SELECTOR = '0xb61d27f6'; // execute(address,uint256,bytes)
const EXECUTE_USER_OP_SELECTOR = '0xe9ae5c53'; // executeUserOp alternative

// Escrow contract possible function selectors
const REDEEM_AND_UNWRAP_SELECTOR = '0x6bd6d4b7'; // redeemAndUnwrap(bytes32,address)
const CLAIM_ESCROW_SELECTOR = '0x4a00000000'; // Example, adjust if known

async function extractEscrowFromTx() {
  console.log('\n🔍 Extracting Escrow ID from Failed Transaction\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log(`\n📍 Transaction Hash: ${TX_HASH}`);
  console.log('   Fetching transaction...');

  const tx = await provider.getTransaction(TX_HASH);
  if (!tx) {
    throw new Error('Transaction not found');
  }

  console.log(`   ✅ Transaction found`);
  console.log(`   From: ${tx.from}`);
  console.log(`   To: ${tx.to}`);
  console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
  console.log(`   Data length: ${tx.data.length} chars`);

  console.log('\n1️⃣  Analyzing transaction input data...');

  const selector = tx.data.slice(0, 10);
  console.log(`   Function selector: ${selector}`);

  // Decode based on selector
  if (selector === '0xb61d27f6') {
    // execute(address dest, uint256 value, bytes func)
    console.log('   Function: execute(address,uint256,bytes)');

    const iface = new ethers.Interface([
      'function execute(address dest, uint256 value, bytes calldata func)',
    ]);

    try {
      const decoded = iface.decodeFunctionData('execute', tx.data);
      console.log(`\n   Decoded parameters:`);
      console.log(`     dest:  ${decoded.dest}`);
      console.log(`     value: ${decoded.value.toString()} wei`);
      console.log(`     func:  ${decoded.func}`);

      // Now decode the inner func call
      const innerSelector = decoded.func.slice(0, 10);
      console.log(`\n   Inner function selector: ${innerSelector}`);

      // Try to decode as redeemAndUnwrap(bytes32 escrowId, address recipient)
      if (innerSelector === '0x4679e667') {
        console.log('   Inner function: redeemAndUnwrap(bytes32,address)');

        const escrowIface = new ethers.Interface([
          'function redeemAndUnwrap(bytes32 escrowId, address recipient)',
        ]);

        try {
          const innerDecoded = escrowIface.decodeFunctionData('redeemAndUnwrap', decoded.func);
          console.log(`\n   🎯 ESCROW ID FOUND!`);
          console.log(`   ═`.repeat(80));
          console.log(`   Escrow ID: ${innerDecoded.escrowId}`);
          console.log(`   Recipient: ${innerDecoded.recipient}`);
          console.log(`\n   To debug this escrow, run:`);
          console.log(`   ESCROW_ID=${innerDecoded.escrowId} npx tsx debug-escrow-state.ts`);
          return innerDecoded.escrowId;
        } catch (e: any) {
          console.log(`   ⚠️  Could not decode inner function: ${e.message}`);
        }
      } else {
        console.log(`   ⚠️  Unknown inner function selector: ${innerSelector}`);
        console.log(`   Raw inner data: ${decoded.func}`);

        // Try manual decoding for bytes32 + address pattern
        if (decoded.func.length >= 138) { // 0x + 8 chars selector + 64 chars escrowId + 64 chars address
          const escrowIdHex = '0x' + decoded.func.slice(10, 74);
          const recipientHex = '0x' + decoded.func.slice(98, 138);

          console.log(`\n   🔍 Manual decode attempt:`);
          console.log(`     Param 1 (bytes32): ${escrowIdHex}`);
          console.log(`     Param 2 (address): ${recipientHex}`);

          console.log(`\n   🎯 POSSIBLE ESCROW ID: ${escrowIdHex}`);
          console.log(`\n   To debug this escrow, run:`);
          console.log(`   ESCROW_ID=${escrowIdHex} npx tsx debug-escrow-state.ts`);
          return escrowIdHex;
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Could not decode execute(): ${error.message}`);
    }
  } else if (selector === '0xe9ae5c53') {
    // executeUserOp or similar
    console.log('   Function: executeUserOp or similar wrapper');
    console.log('   Attempting manual decode...');

    // Try to find escrow ID pattern in calldata (bytes32 = 64 hex chars)
    // Search for patterns that might be escrowId
    console.log(`\n   Searching for escrow ID patterns in calldata...`);

    // Raw calldata analysis
    const calldata = tx.data.slice(10); // Remove selector
    console.log(`   Calldata length (without selector): ${calldata.length / 2} bytes`);

    // Look for address 0xeD6fE6008D6bbCe64dCCAFBb3E03919ba684F83D in the data
    const workerAddrSearch = 'ed6fe6008d6bbce64dccafbb3e03919ba684f83d';
    const workerIndex = calldata.toLowerCase().indexOf(workerAddrSearch);

    if (workerIndex !== -1) {
      console.log(`   ✅ Found worker address at position ${workerIndex / 2} bytes`);

      // Escrow ID should be before the recipient address
      // Look 64 chars (32 bytes) before the address
      if (workerIndex >= 64) {
        const possibleEscrowId = '0x' + calldata.slice(workerIndex - 64, workerIndex);
        console.log(`\n   🎯 POSSIBLE ESCROW ID: ${possibleEscrowId}`);
        console.log(`\n   To debug this escrow, run:`);
        console.log(`   ESCROW_ID=${possibleEscrowId} npx tsx debug-escrow-state.ts`);
        return possibleEscrowId;
      }
    } else {
      console.log(`   ⚠️  Worker address not found in calldata`);
      console.log(`   Full calldata: 0x${selector}${calldata}`);
    }
  } else {
    console.log(`   ⚠️  Unknown function selector: ${selector}`);
    console.log(`   Full data: ${tx.data}`);
  }

  // Fetch receipt to analyze logs
  console.log('\n2️⃣  Fetching transaction receipt...');
  const receipt = await provider.getTransactionReceipt(TX_HASH);

  if (!receipt) {
    console.log('   ❌ Receipt not found');
    return;
  }

  console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
  console.log(`   Logs count: ${receipt.logs.length}`);

  // Look for UserOperationEvent
  const entryPointIface = new ethers.Interface(ENTRY_POINT_ABI);

  for (const log of receipt.logs) {
    try {
      const parsed = entryPointIface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed && parsed.name === 'UserOperationEvent') {
        console.log(`\n   📢 UserOperationEvent found:`);
        console.log(`      userOpHash: ${parsed.args.userOpHash}`);
        console.log(`      sender:     ${parsed.args.sender}`);
        console.log(`      success:    ${parsed.args.success ? '✅ true' : '❌ false'}`);
        console.log(`      actualGasCost: ${ethers.formatEther(parsed.args.actualGasCost)} ETH`);
      }
    } catch (e) {
      // Skip non-matching logs
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Analysis complete!\n');
}

// Run
extractEscrowFromTx()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
