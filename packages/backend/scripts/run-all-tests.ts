#!/usr/bin/env tsx
/**
 * Comprehensive Test Suite - Execute all tests from LOCAL_TESTING.md and E2E_TESTING.md
 *
 * Tests everything that can be automated without manual wallet signing
 */

import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const BASE_URL = process.env.BASE_URL || 'https://lendi-origins.vercel.app';
const LENDI_PROOF_ADDRESS = process.env.LENDI_PROOF_ADDRESS || '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4';
const RPC_URL = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

const LENDI_PROOF_ABI = parseAbi([
  'function registeredWorkers(address) view returns (bool)',
  'function registeredLenders(address) view returns (bool)',
  'function owner() view returns (address)',
]);

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

function logTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string) {
  testResults.total++;

  const symbols = {
    PASS: '✅',
    FAIL: '❌',
    SKIP: '⏸️ ',
  };

  if (status === 'PASS') testResults.passed++;
  if (status === 'FAIL') testResults.failed++;
  if (status === 'SKIP') testResults.skipped++;

  console.log(`${symbols[status]} ${name}`);
  if (message) {
    console.log(`   ${message}\n`);
  }
}

async function main() {
  console.log('\n🧪 Comprehensive Test Suite - Lendi Backend Wave 2\n');
  console.log('='.repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`   Backend:      ${BASE_URL}`);
  console.log(`   LendiProof:   ${LENDI_PROOF_ADDRESS}`);
  console.log(`   Network:      Arbitrum Sepolia`);
  console.log(`   RPC:          ${RPC_URL}\n`);
  console.log('='.repeat(70));
  console.log('\n');

  // ============================================
  // LOCAL_TESTING.md - Automated Tests
  // ============================================
  console.log('📝 LOCAL_TESTING.md - Automated Tests\n');

  // Test 1: Health Check
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    if (response.ok && data.status === 'healthy') {
      logTest('Health Check', 'PASS', `Chain ID: ${data.environment.chainId}, DB: ${data.environment.dbProvider}`);
    } else {
      logTest('Health Check', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error: any) {
    logTest('Health Check', 'FAIL', error.message);
  }

  // Test 2: OpenAPI Documentation
  try {
    const response = await fetch(`${BASE_URL}/api/v1/docs/openapi.json`);
    const data = await response.json();

    if (response.ok && data.openapi) {
      logTest('OpenAPI Documentation', 'PASS', `Version: ${data.info?.version || 'unknown'}`);
    } else {
      logTest('OpenAPI Documentation', 'FAIL');
    }
  } catch (error: any) {
    logTest('OpenAPI Documentation', 'FAIL', error.message);
  }

  // Test 3: SIWE Nonce Request (no auth required)
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/wallet/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: '0x799795DDef56d71A4d98Fac65cb88B7389614aBC' }),
    });
    const data = await response.json();

    if (response.ok && data.nonce) {
      logTest('SIWE Nonce Request', 'PASS', `Nonce length: ${data.nonce.length} chars`);
    } else {
      logTest('SIWE Nonce Request', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error: any) {
    logTest('SIWE Nonce Request', 'FAIL', error.message);
  }

  // Test 4: Protected Endpoint (should reject without auth)
  try {
    const response = await fetch(`${BASE_URL}/api/v1/workers`);

    if (response.status === 401) {
      logTest('Protected Endpoint (Auth Required)', 'PASS', 'Correctly rejects unauthenticated requests');
    } else {
      logTest('Protected Endpoint (Auth Required)', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error: any) {
    logTest('Protected Endpoint (Auth Required)', 'FAIL', error.message);
  }

  // Test 5: Invalid Route (should return 404)
  try {
    const response = await fetch(`${BASE_URL}/api/v1/nonexistent`);

    if (response.status === 404) {
      logTest('404 Handler', 'PASS', 'Correctly handles non-existent routes');
    } else {
      logTest('404 Handler', 'FAIL', `Expected 404, got ${response.status}`);
    }
  } catch (error: any) {
    logTest('404 Handler', 'FAIL', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 E2E_TESTING.md - Automated Tests\n');

  // Setup blockchain client
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  });

  // Test 6: Contract Accessibility
  try {
    const owner = await publicClient.readContract({
      address: LENDI_PROOF_ADDRESS as Address,
      abi: LENDI_PROOF_ABI,
      functionName: 'owner',
    });

    logTest('Contract Accessibility', 'PASS', `Owner: ${owner}`);
  } catch (error: any) {
    logTest('Contract Accessibility', 'FAIL', error.message);
  }

  // Test 7: Backend Signer Registration Status
  try {
    const backendSigner = '0x799795DDef56d71A4d98Fac65cb88B7389614aBC';
    const isRegistered = await publicClient.readContract({
      address: LENDI_PROOF_ADDRESS as Address,
      abi: LENDI_PROOF_ABI,
      functionName: 'registeredLenders',
      args: [backendSigner as Address],
    });

    if (isRegistered) {
      logTest('Backend Signer Registered as Lender', 'PASS', `Address: ${backendSigner}`);
    } else {
      logTest('Backend Signer Registered as Lender', 'FAIL', 'Backend signer is NOT registered');
    }
  } catch (error: any) {
    logTest('Backend Signer Registered as Lender', 'FAIL', error.message);
  }

  // Test 8: Worker Registration Status (test wallet)
  try {
    const testWorker = '0x799795DDef56d71A4d98Fac65cb88B7389614aBC';
    const isRegistered = await publicClient.readContract({
      address: LENDI_PROOF_ADDRESS as Address,
      abi: LENDI_PROOF_ABI,
      functionName: 'registeredWorkers',
      args: [testWorker as Address],
    });

    logTest('Test Worker Registration Status', 'PASS', `Registered: ${isRegistered}`);
  } catch (error: any) {
    logTest('Test Worker Registration Status', 'FAIL', error.message);
  }

  // Test 9: Network Configuration
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const chainId = await publicClient.getChainId();

    if (chainId === 421614) {
      logTest('Network Configuration', 'PASS', `Chain ID: ${chainId}, Block: ${blockNumber}`);
    } else {
      logTest('Network Configuration', 'FAIL', `Wrong chain ID: ${chainId}`);
    }
  } catch (error: any) {
    logTest('Network Configuration', 'FAIL', error.message);
  }

  // Test 10: RPC Connection Health
  try {
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const lag = Date.now() / 1000 - Number(block.timestamp);

    if (lag < 60) {
      logTest('RPC Connection Health', 'PASS', `Block lag: ${Math.floor(lag)}s`);
    } else {
      logTest('RPC Connection Health', 'FAIL', `Block too old: ${Math.floor(lag)}s lag`);
    }
  } catch (error: any) {
    logTest('RPC Connection Health', 'FAIL', error.message);
  }

  // ============================================
  // Manual Tests (Cannot automate)
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Tests Requiring Manual Execution\n');

  logTest('SIWE Wallet Verification', 'SKIP', 'Requires wallet signature - see E2E_TESTING.md');
  logTest('Worker Creation with Auth', 'SKIP', 'Requires JWT token - see E2E_TESTING.md');
  logTest('Income Recording (FHE)', 'SKIP', 'Requires FHE encryption from frontend/dapp');
  logTest('Loan Creation Flow', 'SKIP', 'Requires authenticated user + FHE setup');
  logTest('FHE Verification (3-step)', 'SKIP', 'Requires on-chain FHE decryption - see E2E_TESTING.md');
  logTest('Escrow Settlement', 'SKIP', 'Requires completed loan + verification');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Results Summary\n');
  console.log(`Total Tests:     ${testResults.total}`);
  console.log(`✅ Passed:        ${testResults.passed}`);
  console.log(`❌ Failed:        ${testResults.failed}`);
  console.log(`⏸️  Skipped:       ${testResults.skipped}\n`);

  const passRate = testResults.total > 0
    ? ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1)
    : '0';

  console.log(`Pass Rate:       ${passRate}% (excluding skipped)\n`);

  if (testResults.failed === 0) {
    console.log('🎉 All automated tests PASSED!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Execute manual tests from E2E_TESTING.md');
    console.log('   2. Test SIWE authentication flow');
    console.log('   3. Test loan creation with FHE encryption');
    console.log('   4. Verify privacy (no amounts in database)\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('\n');
}

main().catch((error) => {
  console.error('\n❌ Test Suite Failed:', error.message);
  process.exit(1);
});
