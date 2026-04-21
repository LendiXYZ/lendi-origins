import { submitVerificationFeedback } from '../src/infrastructure/blockchain/agent0.client.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

/**
 * Test PIECE 3 - Reputation Loop
 * Tests submitVerificationFeedback() to ensure ERC-8004 integration works
 */
async function testFeedback() {
  console.log('\n🔄 Test PIECE 3 - Reputation Loop (submitVerificationFeedback)');
  console.log('═'.repeat(80));
  console.log('');

  // Check environment variables
  console.log('1️⃣  Checking environment variables...');
  const requiredVars = [
    'ETH_SEPOLIA_PRIVATE_KEY',
    'ETH_SEPOLIA_RPC_URL',
    'AGENT_ID',
    'LENDI_VERIFIER_URL',
    'BASE_SEPOLIA_RECEIVER_ADDRESS',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`   ❌ Missing environment variables: ${missing.join(', ')}`);
    console.log('');
    console.log('   Required:');
    console.log('   - ETH_SEPOLIA_PRIVATE_KEY');
    console.log('   - ETH_SEPOLIA_RPC_URL');
    console.log('   - AGENT_ID (from register-agent.ts)');
    console.log('   - LENDI_VERIFIER_URL');
    console.log('   - BASE_SEPOLIA_RECEIVER_ADDRESS');
    console.log('');
    console.log('   Run register-agent.ts first to get AGENT_ID');
    process.exit(1);
  }

  console.log('   ✅ All environment variables present');
  console.log(`   AGENT_ID: ${process.env.AGENT_ID}`);
  console.log(`   Lender: ${process.env.BASE_SEPOLIA_RECEIVER_ADDRESS}`);
  console.log('');

  // Test data
  const testParams = {
    lenderAddress: process.env.BASE_SEPOLIA_RECEIVER_ADDRESS!,
    escrowId: '123', // Test escrow ID
    eligible: true, // Test: worker is eligible
    x402TxHash: '0x' + '0'.repeat(64), // Mock x402 tx hash
    x402ReceiverAddress: process.env.BASE_SEPOLIA_RECEIVER_ADDRESS!,
  };

  console.log('2️⃣  Test parameters:');
  console.log(`   Lender: ${testParams.lenderAddress}`);
  console.log(`   Escrow ID: ${testParams.escrowId}`);
  console.log(`   Eligible: ${testParams.eligible}`);
  console.log(`   x402 TxHash: ${testParams.x402TxHash.slice(0, 20)}...`);
  console.log('');

  console.log('3️⃣  Submitting feedback to ERC-8004...');
  console.log('   This will:');
  console.log('   - Connect to ETH Sepolia');
  console.log('   - Prepare feedback file with proofOfPayment');
  console.log('   - Submit via Agent0 SDK');
  console.log('   - Record reputation on-chain');
  console.log('');

  try {
    const txHash = await submitVerificationFeedback(testParams);

    console.log('   ✅ Feedback submitted successfully!');
    console.log('');
    console.log('═'.repeat(80));
    console.log('SUCCESS - PIECE 3 Complete');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`Transaction Hash: ${txHash}`);
    console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    console.log(`View Agent: https://8004scan.io/agents/${process.env.AGENT_ID}`);
    console.log('');
    console.log('Feedback Details:');
    console.log(`  - Agent: LendiVerifier (${process.env.AGENT_ID})`);
    console.log(`  - Client: ${testParams.lenderAddress}`);
    console.log(`  - Value: 100 (eligible)`);
    console.log(`  - Tags: income_verification, fhe_proof`);
    console.log(`  - Payment: ${testParams.x402TxHash} (Base Sepolia)`);
    console.log('');
  } catch (error: any) {
    console.error('   ❌ Feedback submission failed');
    console.error('');
    console.error('Error:', error.message);

    if (error.message.includes('AGENT_ID')) {
      console.log('');
      console.log('💡 Run register-agent.ts first to get AGENT_ID');
    }

    process.exit(1);
  }
}

testFeedback().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
