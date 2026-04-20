import { ethers } from 'ethers';

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const TX_HASHES = [
  '0x0012ab63d94be07e934cb3f5492263b2497000d94026deb4e023e93eaaed6a46',
  '0x6e48be6a47d20fc9ea9fa2beaea22f729d4c09c31958a8681085a6643cfb8c2e',
];

async function checkTxs() {
  console.log('\n🔍 Analyzing Escrow 74 Creation Transactions\n');
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  for (const txHash of TX_HASHES) {
    console.log(`\n📋 Transaction: ${txHash}`);
    console.log('─'.repeat(80));

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      console.log('   ❌ Receipt not found');
      continue;
    }

    const status = receipt.status === 1 ? '✅ Success' : '❌ Failed';
    console.log(`   Status: ${status}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   From: ${receipt.from}`);
    console.log(`   To: ${receipt.to}`);
    console.log(`   Logs: ${receipt.logs.length}`);

    // Analyze each log
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\n   Log #${i}:`);
      console.log(`     Address: ${log.address}`);
      console.log(`     Topic[0]: ${log.topics[0]}`);

      // Check if this log is about escrow 74
      const escrowId74 = ethers.zeroPadValue(ethers.toBeHex(74), 32);
      if (log.topics.some(t => t.toLowerCase() === escrowId74.toLowerCase())) {
        console.log(`     ✅ Contains Escrow ID 74`);
        console.log(`     Topics: ${JSON.stringify(log.topics, null, 8)}`);
        console.log(`     Data: ${log.data}`);

        // Try to decode topic[1] if it's an address
        if (log.topics.length > 2) {
          const possibleAddress = '0x' + log.topics[2].slice(26);
          console.log(`     Topic[2] as address: ${possibleAddress}`);
        }
      }
    }

    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('\nView transactions on Arbiscan:');
  for (const txHash of TX_HASHES) {
    console.log(`https://sepolia.arbiscan.io/tx/${txHash}`);
  }
  console.log('');
}

checkTxs()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
