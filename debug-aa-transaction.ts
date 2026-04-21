import { ethers } from 'ethers';

/**
 * Script para debuggear transacciones AA fallidas en Lendi
 *
 * Verifica los requisitos más comunes que causan fallos:
 * - Backend signer registrado
 * - USDC allowance
 * - Worker/Lender registrado
 * - Balance de USDC
 */

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF_ADDRESS = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac'; // LendiProof (tiene registerLender + transferFrom)
const LENDI_PROOF_GATE_ADDRESS = '0x06b0523e63FF904d622aa6d125FdEe11201Bf791'; // LendiProofGate
const LENDI_POLICY_ADDRESS = '0x68AE6d292553C0fBa8e797c0056Efe56038227A1'; // LendiPolicy (NO maneja USDC)
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

// ABI mínimas necesarias
const PROOF_ABI = [
  'function workers(address) view returns (bool isRegistered, uint256 totalIncome, uint256 proofCount)',
  'function registeredSigners(address) view returns (bool)',
];

const GATE_ABI = [
  'function lenders(address) view returns (bool isActive, uint256 totalPool, uint256 totalLent, uint256 interestRate)',
  'function registeredSigners(address) view returns (bool)',
];

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function debugAATransaction(smartAccountAddress: string) {
  console.log('\n🔍 Debugging AA Transaction for:', smartAccountAddress);
  console.log('═'.repeat(80));

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const proof = new ethers.Contract(LENDI_PROOF_ADDRESS, PROOF_ABI, provider);
  const gate = new ethers.Contract(LENDI_PROOF_GATE_ADDRESS, GATE_ABI, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

  // 1. Verificar balance de ETH
  console.log('\n1️⃣  Checking ETH balance...');
  const ethBalance = await provider.getBalance(smartAccountAddress);
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  if (ethBalance < ethers.parseEther('0.001')) {
    console.log('   ⚠️  WARNING: Low ETH balance (< 0.001 ETH)');
  } else {
    console.log('   ✅ Sufficient ETH for gas');
  }

  // 2. Verificar balance de USDC
  console.log('\n2️⃣  Checking USDC balance...');
  const usdcBalance = await usdc.balanceOf(smartAccountAddress);
  const decimals = await usdc.decimals();
  console.log(`   USDC Balance: ${ethers.formatUnits(usdcBalance, decimals)} USDC`);
  if (usdcBalance === 0n) {
    console.log('   ⚠️  WARNING: No USDC balance');
  }

  // 3. Verificar allowance de USDC para LendiProof (que es quien cobra el fee)
  console.log('\n3️⃣  Checking USDC allowance for LendiProof (registerLender fee)...');
  const allowance = await usdc.allowance(smartAccountAddress, LENDI_PROOF_ADDRESS);
  console.log(`   Allowance: ${ethers.formatUnits(allowance, decimals)} USDC`);
  if (allowance === 0n) {
    console.log('   ❌ NO ALLOWANCE: Must approve USDC to LendiProof first!');
    console.log(`   → Run: usdc.approve("${LENDI_PROOF_ADDRESS}", amount)`);
    console.log(`   → LendiProof.registerLender() requires 1 USDC via transferFrom()`);
  } else {
    console.log('   ✅ USDC is approved for LendiProof');
  }

  // 4. Verificar si el worker está registrado
  console.log('\n4️⃣  Checking Worker registration...');
  try {
    const [isRegistered, totalIncome, proofCount] = await proof.workers(smartAccountAddress);
    console.log(`   Registered: ${isRegistered}`);
    console.log(`   Total Income: ${totalIncome.toString()}`);
    console.log(`   Proof Count: ${proofCount.toString()}`);
    if (!isRegistered) {
      console.log('   ⚠️  Worker NOT registered');
      console.log('   → Must call: LendiProof.registerWorker() first');
    } else {
      console.log('   ✅ Worker is registered');
    }
  } catch (error) {
    console.log('   ℹ️  Could not check worker status');
  }

  // 5. Verificar si el lender está registrado
  console.log('\n5️⃣  Checking Lender registration...');
  try {
    const [isActive, totalPool, totalLent, interestRate] = await gate.lenders(smartAccountAddress);
    console.log(`   Active: ${isActive}`);
    console.log(`   Total Pool: ${ethers.formatUnits(totalPool, decimals)} USDC`);
    console.log(`   Total Lent: ${ethers.formatUnits(totalLent, decimals)} USDC`);
    console.log(`   Interest Rate: ${interestRate.toString()} bps`);
    if (!isActive) {
      console.log('   ⚠️  Lender NOT registered');
      console.log('   → Must call: LendiProofGate.registerLender(poolAmount, rate) first');
    } else {
      console.log('   ✅ Lender is registered');
    }
  } catch (error) {
    console.log('   ℹ️  Could not check lender status');
  }

  // 6. Verificar backend signer en LendiProof
  console.log('\n6️⃣  Checking Backend Signer in LendiProof...');
  const backendAddress = '0xYourBackendAddress'; // ACTUALIZAR CON LA DIRECCIÓN REAL
  try {
    const isRegistered = await proof.registeredSigners(backendAddress);
    console.log(`   Backend (${backendAddress}): ${isRegistered ? '✅ Registered' : '❌ NOT Registered'}`);
    if (!isRegistered) {
      console.log('   → Backend must be registered first!');
      console.log('   → Run: scripts/register-backend-signer.ts');
    }
  } catch (error) {
    console.log('   ⚠️  Update backendAddress in this script');
  }

  // 7. Verificar backend signer en LendiProofGate
  console.log('\n7️⃣  Checking Backend Signer in LendiProofGate...');
  try {
    const isRegistered = await gate.registeredSigners(backendAddress);
    console.log(`   Backend (${backendAddress}): ${isRegistered ? '✅ Registered' : '❌ NOT Registered'}`);
    if (!isRegistered) {
      console.log('   → Backend must be registered in Gate too!');
    }
  } catch (error) {
    console.log('   ⚠️  Update backendAddress in this script');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Debug complete!\n');
}

// Ejecutar con la dirección de la smart account que falló
const SMART_ACCOUNT = '0xeD6fE6008D6bbCe64dCCAFBb3E03919ba684F83D';

debugAATransaction(SMART_ACCOUNT)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
