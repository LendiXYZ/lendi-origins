import hre from 'hardhat';

/**
 * Helper script to register as a lender by paying 1 USDC fee
 * Usage: npx hardhat run scripts/register-lender.ts --network arbitrumSepolia
 */

const INFORMAL_PROOF_ADDRESS = process.env.INFORMAL_PROOF_ADDRESS || '';
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'; // Arbitrum Sepolia

async function main() {
  if (!INFORMAL_PROOF_ADDRESS) {
    throw new Error('Please set INFORMAL_PROOF_ADDRESS environment variable');
  }

  const [signer] = await hre.ethers.getSigners();
  console.log('Registering lender with account:', signer.address);
  console.log('Network:', hre.network.name);

  // Get contract instances
  const informalProof = await hre.ethers.getContractAt('InformalProof', INFORMAL_PROOF_ADDRESS);
  const usdc = await hre.ethers.getContractAt('IERC20', USDC_ADDRESS);

  // Check if already registered
  const isRegistered = await informalProof.registeredLenders(signer.address);
  if (isRegistered) {
    console.log('✅ Already registered as lender');
    return;
  }

  // Check USDC balance
  const balance = await usdc.balanceOf(signer.address);
  const fee = await informalProof.LENDER_REGISTRATION_FEE();
  console.log(`USDC Balance: ${balance.toString()} (${hre.ethers.formatUnits(balance, 6)} USDC)`);
  console.log(`Registration Fee: ${fee.toString()} (${hre.ethers.formatUnits(fee, 6)} USDC)`);

  if (balance < fee) {
    throw new Error('Insufficient USDC balance. Get testnet USDC from faucet first.');
  }

  // Step 1: Approve USDC spending
  console.log('\nStep 1: Approving USDC...');
  const approveTx = await usdc.approve(INFORMAL_PROOF_ADDRESS, fee);
  await approveTx.wait();
  console.log('✅ USDC approved');

  // Step 2: Register as lender
  console.log('\nStep 2: Registering as lender...');
  const registerTx = await informalProof.registerLender();
  await registerTx.wait();
  console.log('✅ Registered as lender!');

  // Verify registration
  const verified = await informalProof.registeredLenders(signer.address);
  console.log('\n=== Registration Complete ===');
  console.log('Address:', signer.address);
  console.log('Registered:', verified);
  console.log('Fee Paid:', hre.ethers.formatUnits(fee, 6), 'USDC');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
