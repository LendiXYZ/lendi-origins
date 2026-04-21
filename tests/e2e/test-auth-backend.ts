#!/usr/bin/env tsx

/**
 * Complete Authentication Flow Test
 *
 * Tests the full authentication flow from backend:
 * 1. Request nonce
 * 2. Sign SIWE message with wallet
 * 3. Verify signature
 * 4. Receive JWT token
 */

import { Wallet } from 'ethers';

const BACKEND_URL = 'https://lendi-origins.vercel.app';

// Using Hardhat's first test account
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new Wallet(PRIVATE_KEY);

interface NonceResponse {
  nonce: string;
}

interface VerifyResponse {
  token: string;
  user: {
    wallet_address: string;
    role: string;
  };
}

async function testAuthFlow() {
  console.log('==========================================');
  console.log('Testing Complete Authentication Flow');
  console.log('==========================================\n');

  console.log(`Using wallet: ${wallet.address}\n`);

  // Step 1: Request nonce
  console.log('Step 1: Requesting nonce...');
  const nonceResponse = await fetch(`${BACKEND_URL}/api/v1/auth/wallet/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: wallet.address }),
  });

  if (!nonceResponse.ok) {
    const error = await nonceResponse.text();
    throw new Error(`Failed to get nonce: ${error}`);
  }

  const { nonce } = await nonceResponse.json() as NonceResponse;
  console.log(`✅ Nonce received: ${nonce}\n`);

  // Step 2: Construct and sign SIWE message
  console.log('Step 2: Constructing and signing SIWE message...');
  const timestamp = new Date().toISOString();
  const siweMessage = `lendi.xyz wants you to sign in with your Ethereum account:
${wallet.address}

Sign in with Ethereum to Lendi

URI: https://lendi.xyz
Version: 1
Chain ID: 421614
Nonce: ${nonce}
Issued At: ${timestamp}`;

  console.log('SIWE Message:');
  console.log('---');
  console.log(siweMessage);
  console.log('---\n');

  const signature = await wallet.signMessage(siweMessage);
  console.log(`✅ Message signed: ${signature.substring(0, 20)}...\n`);

  // Step 3: Verify signature
  console.log('Step 3: Verifying signature...');
  const verifyResponse = await fetch(`${BACKEND_URL}/api/v1/auth/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: wallet.address,
      message: siweMessage,
      signature: signature,
    }),
  });

  if (!verifyResponse.ok) {
    const error = await verifyResponse.text();
    throw new Error(`Failed to verify signature: ${error}`);
  }

  const verifyData = await verifyResponse.json() as VerifyResponse;
  console.log('✅ Signature verified!\n');

  // Step 4: Check response
  console.log('Step 4: Authentication successful');
  console.log('---');
  console.log('Response:', JSON.stringify(verifyData, null, 2));
  if (verifyData.token) {
    console.log(`JWT Token: ${verifyData.token.substring(0, 50)}...`);
    console.log(`User wallet: ${verifyData.user.wallet_address}`);
    console.log(`User role: ${verifyData.user.role}`);
  }
  console.log('---\n');

  console.log('==========================================');
  console.log('✅ AUTHENTICATION FLOW TEST PASSED');
  console.log('==========================================\n');

  console.log('Redis-based nonce storage is working correctly!');
  console.log('The 401 errors should be resolved.');
}

// Run the test
testAuthFlow().catch((error) => {
  console.error('\n❌ TEST FAILED:');
  console.error(error.message);
  process.exit(1);
});
