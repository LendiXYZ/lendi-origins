import hre from 'hardhat';

// Official USDC addresses by network
// Source: https://developers.circle.com/stablecoins/usdc-contract-addresses
const USDC_ADDRESSES: Record<string, string> = {
  'arb-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Official Circle USDC for Arbitrum Sepolia Testnet
  'eth-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Official Circle USDC for Ethereum Sepolia
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Official Circle USDC for Ethereum Mainnet (for reference)
  // Add more networks as needed
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log('Network:', hre.network.name);

  // Get USDC address for current network
  const usdcAddress = USDC_ADDRESSES[hre.network.name];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${hre.network.name}`);
  }
  console.log('Using USDC at:', usdcAddress);

  // Deploy LendiProof (formerly InformalProof)
  console.log('\nDeploying LendiProof...');
  const LendiProof = await hre.ethers.getContractFactory('LendiProof');
  const lendiProof = await LendiProof.deploy(usdcAddress);
  await lendiProof.waitForDeployment();
  const lendiProofAddress = await lendiProof.getAddress();
  console.log('LendiProof deployed to:', lendiProofAddress);

  // Deploy LendiProofGate (formerly InformalProofGate)
  console.log('\nDeploying LendiProofGate...');
  const Gate = await hre.ethers.getContractFactory('LendiProofGate');
  const gate = await Gate.deploy(lendiProofAddress);
  await gate.waitForDeployment();
  const gateAddress = await gate.getAddress();
  console.log('LendiProofGate deployed to:', gateAddress);

  // Register deployer as lender (free registration by owner)
  console.log('\nRegistering deployer as lender (free by owner)...');
  const tx = await lendiProof.registerLenderByOwner(deployer.address);
  await tx.wait();
  console.log('Deployer registered as lender:', deployer.address);

  // Register gate as lender (so it can call proveIncome)
  console.log('\nRegistering gate as lender (free by owner)...');
  const tx2 = await lendiProof.registerLenderByOwner(gateAddress);
  await tx2.wait();
  console.log('Gate registered as lender:', gateAddress);

  // Deploy LendiPolicy (Wave 2)
  console.log('\nDeploying LendiPolicy...');
  const Policy = await hre.ethers.getContractFactory('LendiPolicy');
  const policy = await Policy.deploy();
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();
  console.log('LendiPolicy deployed to:', policyAddress);

  console.log('\n=== Deployment Summary ===');
  console.log('Network:', hre.network.name);
  console.log('USDC Token:', usdcAddress);
  console.log('LendiProof:', lendiProofAddress);
  console.log('LendiProofGate:', gateAddress);
  console.log('LendiPolicy:', policyAddress);
  console.log('Deployer (registered as lender):', deployer.address);
  console.log('\n=== Important Notes ===');
  console.log('- Lender registration fee: 100 USDC (100000000 units)');
  console.log('- New lenders must approve USDC spending before calling registerLender()');
  console.log('- Owner can register lenders for free using registerLenderByOwner()');
  console.log('- escrowId type: uint256 (ReinieraOS compatible)');
  console.log('- LendiProofGate implements IConditionResolver + ERC-165 + onConditionSet()');
  console.log('- LendiPolicy implements IUnderwriterPolicy + ERC-165 (fixed 5% risk, always approves)');
  console.log('\nVerification commands:');
  console.log(`npx hardhat verify --network ${hre.network.name} ${lendiProofAddress} ${usdcAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${gateAddress} ${lendiProofAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${policyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
