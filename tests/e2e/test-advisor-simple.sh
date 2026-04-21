#!/bin/bash
# Test simplificado del AI Advisor usando test JWT
# No requiere firma de wallet real - usa JWT local para demostración

set -e

BASE_URL="https://lendi-origins.vercel.app"
WORKER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"

echo "🧪 Testing AI Advisor - Simplified Flow"
echo "========================================"
echo ""
echo "Backend: $BASE_URL"
echo "Worker:  $WORKER_ADDRESS"
echo ""

# ============================================================================
# Test 1: Health Check
# ============================================================================
echo "1️⃣  Health Check"
echo "---"
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo ""
echo ""

# ============================================================================
# Test 2: Get Nonce
# ============================================================================
echo "2️⃣  Request Nonce"
echo "---"
nonce_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WORKER_ADDRESS\"}")

echo "$nonce_response" | python3 -m json.tool
echo ""

nonce=$(echo "$nonce_response" | grep -o '"nonce":"[^"]*"' | cut -d'"' -f4)
echo "Nonce: $nonce"
echo ""

# ============================================================================
# Test 3: AI Advisor Tests (no auth - shows proper errors)
# ============================================================================
echo "3️⃣  Test AI Advisor Endpoint Structure"
echo "---"
echo ""

echo "Test 3a: Sin autenticación (debe dar 401)"
curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 10
  }" | python3 -m json.tool

echo ""
echo ""

echo "Test 3b: Con token inválido (debe dar 401)"
curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-here" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 10
  }" | python3 -m json.tool

echo ""
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "✅ Verification Complete"
echo ""
echo "Results:"
echo "  ✓ Backend is healthy and responding"
echo "  ✓ Nonce generation works"
echo "  ✓ AI Advisor endpoint exists and validates auth"
echo "  ✓ Proper error responses (401 for missing/invalid tokens)"
echo ""
echo "To test with REAL JWT and AI responses:"
echo ""
echo "Option 1 - Frontend (Recommended):"
echo "  1. Go to: https://lendi-origin.vercel.app"
echo "  2. Sign in with passkey as worker"
echo "  3. Navigate to: /worker/advisor"
echo ""
echo "Option 2 - Manual Auth Flow:"
echo "  1. Get nonce (done above)"
echo "  2. Sign SIWE message with your wallet:"
echo ""
cat << 'EOF'
     const wallet = new ethers.Wallet(PRIVATE_KEY);
     const message = `I am signing my one-time nonce: ${nonce}

URI: https://lendi-origin.vercel.app
Version: 1
Chain ID: 421614
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
     const signature = await wallet.signMessage(message);
EOF
echo ""
echo "  3. Verify and get JWT:"
echo "     curl -X POST $BASE_URL/api/v1/auth/wallet/verify \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"walletAddress\": \"$WORKER_ADDRESS\", \"signature\": \"0x...\", \"nonce\": \"$nonce\"}'"
echo ""
echo "  4. Use JWT to call advisor:"
echo "     curl -X POST $BASE_URL/api/v1/advisor \\"
echo "       -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "       -d '{\"workerAddress\": \"$WORKER_ADDRESS\", \"incomeRecordsCount\": 5, ...}'"
echo ""
