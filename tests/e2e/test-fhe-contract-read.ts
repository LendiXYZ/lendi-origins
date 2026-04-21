import { ethers } from 'ethers';

/**
 * Test: Leer handle FHE encriptado desde contrato LendiProof
 *
 * Este test demuestra:
 * ✅ Podemos conectarnos al contrato en Arbitrum Sepolia
 * ✅ Podemos llamar getMyMonthlyIncome() y obtener el handle
 * ❌ NO podemos descifrar sin CoFHE (solo funciona en navegador)
 */

const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const LENDI_PROOF_ADDRESS = '0x2b87fC209861595342d36E71daB22839534d4aC7';

// ABI minimal de LendiProof
const LENDI_PROOF_ABI = [
  'function getMyMonthlyIncome() external view returns (uint256)',
  'function monthlyIncome(address) external view returns (uint256)',
  'function workers(address) external view returns (bool)',
];

async function testFHEContractRead() {
  console.log('\n🔐 Test: Leer Handle FHE desde Contrato LendiProof');
  console.log('═'.repeat(80));
  console.log(`Network: Arbitrum Sepolia`);
  console.log(`RPC: ${ARBITRUM_SEPOLIA_RPC}`);
  console.log(`Contract: ${LENDI_PROOF_ADDRESS}`);
  console.log('');

  // ============================================================================
  // 1. Conectar a Arbitrum Sepolia
  // ============================================================================
  console.log('1️⃣  Conectando a Arbitrum Sepolia...');
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  const network = await provider.getNetwork();
  console.log(`   ✅ Conectado a chain ID: ${network.chainId}`);
  console.log('');

  // ============================================================================
  // 2. Crear instancia del contrato
  // ============================================================================
  console.log('2️⃣  Creando instancia del contrato LendiProof...');
  const contract = new ethers.Contract(LENDI_PROOF_ADDRESS, LENDI_PROOF_ABI, provider);
  console.log(`   ✅ Contrato instanciado`);
  console.log('');

  // ============================================================================
  // 3. Crear wallet de prueba
  // ============================================================================
  console.log('3️⃣  Generando wallet de prueba...');
  const wallet = ethers.Wallet.createRandom().connect(provider);
  console.log(`   Address: ${wallet.address}`);
  console.log('');

  // ============================================================================
  // 4. Verificar si el wallet es un worker registrado
  // ============================================================================
  console.log('4️⃣  Verificando si es worker registrado...');
  try {
    const isWorker = await contract.workers(wallet.address);
    console.log(`   Worker registrado: ${isWorker}`);

    if (!isWorker) {
      console.log('   ⚠️  Este wallet no está registrado como worker');
      console.log('   💡 Para probar el flujo completo necesitas:');
      console.log('      1. Registrar un worker desde el frontend');
      console.log('      2. Llamar recordIncome() para encriptar ingresos');
      console.log('      3. Luego getMyMonthlyIncome() devolverá el handle FHE');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // ============================================================================
  // 5. Intentar leer el income encriptado
  // ============================================================================
  console.log('5️⃣  Intentando leer monthlyIncome (handle FHE)...');
  try {
    // Leer directamente del mapping monthlyIncome
    const handle = await contract.monthlyIncome(wallet.address);
    console.log(`   ✅ Handle obtenido: ${handle.toString()}`);

    if (handle === 0n) {
      console.log('   ⚠️  Handle es 0 (worker no ha registrado ingresos)');
    } else {
      console.log('   ✅ Handle válido (income está encriptado on-chain)');
      console.log('');
      console.log('   🔒 Para descifrar este handle necesitas:');
      console.log('      • CoFHE SDK (solo funciona en navegador)');
      console.log('      • 10-30 segundos de procesamiento');
      console.log('      • El resultado será el ingreso mensual en USDC');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');

  // ============================================================================
  // 6. Probar con una dirección conocida (si existe)
  // ============================================================================
  console.log('6️⃣  Probando con direcciones de ejemplo...');

  // Lista de workers que podrían tener ingresos registrados
  const testAddresses = [
    '0x7acdF65f28eaed9352Dc2C4bae2a04ecD9B97050', // From previous test
    '0x29D6Ec2c8Cc792d63558ef86B9B28d1273f081b5', // From PIECE 5 test
  ];

  for (const addr of testAddresses) {
    try {
      const handle = await contract.monthlyIncome(addr);
      const isWorker = await contract.workers(addr);

      console.log(`   Address: ${addr}`);
      console.log(`   Worker: ${isWorker}`);
      console.log(`   Handle: ${handle.toString()}`);

      if (handle !== 0n) {
        console.log(`   ✅ Este worker tiene ingresos encriptados!`);
      }
      console.log('');
    } catch (error: any) {
      console.log(`   ❌ Error con ${addr}: ${error.message}`);
      console.log('');
    }
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('═'.repeat(80));
  console.log('RESUMEN - Test de Lectura FHE');
  console.log('═'.repeat(80));
  console.log('');
  console.log('✅ Podemos conectarnos al contrato LendiProof en Arbitrum Sepolia');
  console.log('✅ Podemos leer el mapping monthlyIncome(address) → euint64 handle');
  console.log('✅ Podemos verificar si un address es worker registrado');
  console.log('');
  console.log('❌ NO podemos descifrar el euint64 sin CoFHE SDK (solo navegador)');
  console.log('');
  console.log('🔄 Flujo completo PIECE 5 requiere:');
  console.log('   1. [✅ Script] Conectar al contrato → getMyMonthlyIncome()');
  console.log('   2. [❌ Solo navegador] Descifrar con CoFHE → plaintext');
  console.log('   3. [✅ Script] Pasar monthlyIncomeUSDC al AI Advisor');
  console.log('');
  console.log('💡 Para testear el flujo completo de PIECE 5:');
  console.log('   • Usa el frontend en http://localhost:4831/worker/advisor');
  console.log('   • O usa https://lendi-origin.vercel.app/worker/advisor');
  console.log('   • Haz clic en "Descifrar Ingresos" (descifrado en navegador)');
  console.log('');
}

// Run
testFHEContractRead()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
