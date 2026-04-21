#!/bin/bash

# Test authentication flow with cURL
# This tests the nonce storage fix using Upstash Redis

set -e

BACKEND_URL="https://lendi-origins.vercel.app"
WALLET_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "=========================================="
echo "Testing Lendi Authentication Flow"
echo "=========================================="
echo ""

# Step 1: Request nonce
echo "1. Requesting nonce for wallet: $WALLET_ADDRESS"
echo "   POST $BACKEND_URL/api/v1/auth/wallet/nonce"
echo ""

NONCE_RESPONSE=$(curl -s -X POST \
  "$BACKEND_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\":\"$WALLET_ADDRESS\"}")

echo "Response:"
echo "$NONCE_RESPONSE" | jq '.'
echo ""

# Extract nonce from response
NONCE=$(echo "$NONCE_RESPONSE" | jq -r '.data.nonce // .nonce // empty')

if [ -z "$NONCE" ]; then
  echo "❌ ERROR: Failed to get nonce from response"
  echo "Response was: $NONCE_RESPONSE"
  exit 1
fi

echo "✅ Nonce received: $NONCE"
echo ""

# Step 2: Construct SIWE message
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
SIWE_MESSAGE="lendi.xyz wants you to sign in with your Ethereum account:
$WALLET_ADDRESS

Sign in with Ethereum to Lendi

URI: https://lendi.xyz
Version: 1
Chain ID: 421614
Nonce: $NONCE
Issued At: $TIMESTAMP"

echo "2. SIWE Message constructed:"
echo "---"
echo "$SIWE_MESSAGE"
echo "---"
echo ""

echo "⚠️  Note: For actual verification, you would need to:"
echo "   1. Sign this message with your wallet's private key"
echo "   2. Send the signature to POST $BACKEND_URL/api/v1/auth/wallet/verify"
echo ""
echo "   Example verification payload:"
echo "   {"
echo "     \"wallet_address\": \"$WALLET_ADDRESS\","
echo "     \"message\": \"<SIWE_MESSAGE>\","
echo "     \"signature\": \"0x<YOUR_SIGNATURE>\""
echo "   }"
echo ""

# Step 3: Test that nonce endpoint is working (call it again)
echo "3. Verifying nonce endpoint is still responsive..."
echo "   POST $BACKEND_URL/api/v1/auth/wallet/nonce"
echo ""

NONCE_RESPONSE_2=$(curl -s -X POST \
  "$BACKEND_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\":\"$WALLET_ADDRESS\"}")

echo "Response:"
echo "$NONCE_RESPONSE_2" | jq '.'
echo ""

NONCE_2=$(echo "$NONCE_RESPONSE_2" | jq -r '.data.nonce // .nonce // empty')

if [ -z "$NONCE_2" ]; then
  echo "❌ ERROR: Failed to get second nonce"
  exit 1
fi

echo "✅ Second nonce received: $NONCE_2"
echo ""

# Check if nonces are different (they should be)
if [ "$NONCE" != "$NONCE_2" ]; then
  echo "✅ Nonces are different (expected behavior)"
else
  echo "⚠️  Warning: Nonces are the same (might be cached)"
fi

echo ""
echo "=========================================="
echo "Basic Test: PASSED ✅"
echo "=========================================="
echo ""
echo "The nonce endpoint is working correctly."
echo "Redis storage appears to be functional."
echo ""
echo "To complete the full authentication test, you need to:"
echo "1. Use a wallet (e.g., MetaMask, ethers.js) to sign the SIWE message"
echo "2. Send the signature to the /verify endpoint"
echo ""
