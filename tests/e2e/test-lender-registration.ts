import { ethers } from 'ethers';

/**
 * Script para probar el registro de lender manualmente
 *
 * Requisitos:
 * - Wallet con ETH en Arbitrum Sepolia (para gas)
 * - Wallet con al menos 1 USDC en Arbitrum Sepolia
 * - PRIVATE_KEY en variables de entorno
 *
 * Uso:
 * PRIVATE_KEY=0x... npx tsx test-lender-registration.ts
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';
const USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

// ABIs mínimas
const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const LENDI_PROOF_ABI = [
  'function registerLender() external',
  'function registeredLenders(address) view returns (bool)',
  'function LENDER_REGISTRATION_FEE() view returns (uint256)',
  'event LenderRegistered(address indexed lender, uint256 fee)',
];

async function testLenderRegistration() {
  console.log('\n🧪 Testing Lender Registration\n');
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

  const usdc = new ethers.Contract(USDC, USDC_ABI, wallet);
  const lendiProof = new ethers.Contract(LENDI_PROOF, LENDI_PROOF_ABI, wallet);

  // 1. Check current status
  console.log('\n1️⃣  Checking current status...');

  const ethBalance = await provider.getBalance(address);
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  const usdcBalance = await usdc.balanceOf(address);
  const decimals = await usdc.decimals();
  console.log(`   USDC Balance: ${ethers.formatUnits(usdcBalance, decimals)} USDC`);

  const isRegistered = await lendiProof.registeredLenders(address);
  console.log(`   Already Registered: ${isRegistered ? '✅ Yes' : '❌ No'}`);

  if (isRegistered) {
    console.log('\n✅ Already registered as lender!');
    return;
  }

  const fee = await lendiProof.LENDER_REGISTRATION_FEE();
  console.log(`   Registration Fee: ${ethers.formatUnits(fee, decimals)} USDC`);

  // Verificar que tenemos suficiente USDC
  if (usdcBalance < fee) {
    throw new Error(`Insufficient USDC balance. Need ${ethers.formatUnits(fee, decimals)} USDC`);
  }

  // 2. Check current allowance
  console.log('\n2️⃣  Checking USDC allowance...');
  const currentAllowance = await usdc.allowance(address, LENDI_PROOF);
  console.log(`   Current Allowance: ${ethers.formatUnits(currentAllowance, decimals)} USDC`);

  // 3. Approve USDC if needed
  if (currentAllowance < fee) {
    console.log('\n3️⃣  Approving USDC...');
    console.log(`   Approving ${ethers.formatUnits(fee, decimals)} USDC to LendiProof...`);

    const approveTx = await usdc.approve(LENDI_PROOF, fee);
    console.log(`   Approval tx: ${approveTx.hash}`);
    console.log('   Waiting for confirmation...');

    const approveReceipt = await approveTx.wait();
    console.log(`   ✅ Approved! (Block: ${approveReceipt.blockNumber})`);

    // Verificar nuevo allowance
    const newAllowance = await usdc.allowance(address, LENDI_PROOF);
    console.log(`   New Allowance: ${ethers.formatUnits(newAllowance, decimals)} USDC`);
  } else {
    console.log('\n3️⃣  ✅ Already approved (skipping)');
  }

  // 4. Register as lender
  console.log('\n4️⃣  Registering as lender...');
  console.log('   Calling LendiProof.registerLender()...');

  const registerTx = await lendiProof.registerLender();
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
      if (parsed && parsed.name === 'LenderRegistered') {
        console.log(`\n   📢 Event: LenderRegistered`);
        console.log(`      Lender: ${parsed.args.lender}`);
        console.log(`      Fee: ${ethers.formatUnits(parsed.args.fee, decimals)} USDC`);
      }
    } catch (e) {
      // Skip logs that don't match
    }
  }

  // 5. Verify registration
  console.log('\n5️⃣  Verifying registration...');
  const isNowRegistered = await lendiProof.registeredLenders(address);
  console.log(`   Registered: ${isNowRegistered ? '✅ Yes' : '❌ No'}`);

  // 6. Check final balances
  console.log('\n6️⃣  Final balances...');
  const finalUsdcBalance = await usdc.balanceOf(address);
  console.log(`   USDC Balance: ${ethers.formatUnits(finalUsdcBalance, decimals)} USDC`);
  console.log(`   Spent: ${ethers.formatUnits(usdcBalance - finalUsdcBalance, decimals)} USDC`);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Lender registration completed successfully!\n');
  console.log(`🔍 Verify on Arbiscan:`);
  console.log(`   https://sepolia.arbiscan.io/address/${address}\n`);
}

// Run
testLenderRegistration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Data:', error.data);
    }
    process.exit(1);
  });
