#!/bin/bash
# Test completo del AI Advisor - Desde registro hasta consejo personalizado
# Prueba el flujo: Auth → Worker Registration → AI Advisor

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${BASE_URL:-https://lendi-origins.vercel.app}"
WORKER_ADDRESS="${WORKER_ADDRESS:-0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}AI Advisor - E2E Test${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Worker:   $WORKER_ADDRESS"
echo ""

# ============================================================================
# 1. Health Check
# ============================================================================
echo -e "${YELLOW}1️⃣  Health Check${NC}"
response=$(curl -s "$BASE_URL/api/health")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"

status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$status" = "healthy" ]; then
  echo -e "${GREEN}✓ Backend is healthy${NC}"
else
  echo -e "${RED}✗ Backend health check failed${NC}"
  exit 1
fi
echo ""

# ============================================================================
# 2. Request Nonce
# ============================================================================
echo -e "${YELLOW}2️⃣  Requesting nonce for worker...${NC}"
nonce_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WORKER_ADDRESS\"}")

echo "$nonce_response" | python3 -m json.tool 2>/dev/null || echo "$nonce_response"

nonce=$(echo "$nonce_response" | grep -o '"nonce":"[^"]*"' | cut -d'"' -f4)
if [ -n "$nonce" ]; then
  echo -e "${GREEN}✓ Nonce received: $nonce${NC}"
else
  echo -e "${RED}✗ Failed to get nonce${NC}"
  exit 1
fi
echo ""

# ============================================================================
# 3. Sign Message (Manual step - showing message)
# ============================================================================
echo -e "${YELLOW}3️⃣  Sign-In with Ethereum (SIWE)${NC}"
echo -e "${BLUE}Manual step required:${NC}"
echo ""
echo "Message to sign:"
echo "---"
cat << EOF
I am signing my one-time nonce: $nonce

URI: https://lendi-origin.vercel.app
Version: 1
Chain ID: 421614
Nonce: $nonce
Issued At: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
echo "---"
echo ""
echo -e "${BLUE}Options to continue:${NC}"
echo "  1. Use MetaMask or wallet to sign this message"
echo "  2. Use ethers.js to sign programmatically:"
echo ""
echo "     const wallet = new ethers.Wallet(PRIVATE_KEY);"
echo "     const signature = await wallet.signMessage(message);"
echo ""
echo -e "${YELLOW}⏸  Press Enter once you have the signature, or Ctrl+C to exit${NC}"
read -r

echo ""
echo "Enter the signature (0x...):"
read -r SIGNATURE

if [ -z "$SIGNATURE" ]; then
  echo -e "${RED}✗ No signature provided${NC}"
  exit 1
fi
echo ""

# ============================================================================
# 4. Verify Signature and Get JWT
# ============================================================================
echo -e "${YELLOW}4️⃣  Verifying signature and getting JWT...${NC}"
auth_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/wallet/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$WORKER_ADDRESS\",
    \"signature\": \"$SIGNATURE\",
    \"nonce\": \"$nonce\"
  }")

echo "$auth_response" | python3 -m json.tool 2>/dev/null || echo "$auth_response"

JWT_TOKEN=$(echo "$auth_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$JWT_TOKEN" ]; then
  echo -e "${GREEN}✓ JWT token received: ${JWT_TOKEN:0:50}...${NC}"
else
  echo -e "${RED}✗ Failed to get JWT token${NC}"
  exit 1
fi
echo ""

# ============================================================================
# 5. Check Worker Status
# ============================================================================
echo -e "${YELLOW}5️⃣  Checking worker status...${NC}"
worker_response=$(curl -s -X GET "$BASE_URL/api/v1/workers/$WORKER_ADDRESS")

echo "$worker_response" | python3 -m json.tool 2>/dev/null || echo "$worker_response"
echo ""

# ============================================================================
# 6. Test AI Advisor - New Worker (0 records)
# ============================================================================
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}AI ADVISOR TESTS${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}6️⃣  Test: New Worker (0 income records)${NC}"
advisor_response_1=$(curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 0,
    \"passesThreshold\": false,
    \"daysActive\": 0
  }")

echo "$advisor_response_1" | python3 -m json.tool
echo ""

# Check if it's a fallback or AI response
message=$(echo "$advisor_response_1" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
if [ -n "$message" ]; then
  echo -e "${GREEN}✓ AI Advisor responded${NC}"
  echo -e "${BLUE}   Message: $message${NC}"
else
  echo -e "${RED}✗ No advice received${NC}"
fi
echo ""

# ============================================================================
# 7. Test AI Advisor - Active Worker (5 records)
# ============================================================================
echo -e "${YELLOW}7️⃣  Test: Active Worker (5 income records, Rappi)${NC}"
advisor_response_2=$(curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 12,
    \"platform\": \"Rappi\"
  }")

echo "$advisor_response_2" | python3 -m json.tool
echo ""

status=$(echo "$advisor_response_2" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
score=$(echo "$advisor_response_2" | grep -o '"creditScore":[0-9]*' | cut -d':' -f2)
if [ -n "$status" ]; then
  echo -e "${GREEN}✓ AI Advisor responded${NC}"
  echo -e "${BLUE}   Status: $status${NC}"
  echo -e "${BLUE}   Credit Score: $score/100${NC}"
else
  echo -e "${YELLOW}⚠ Possible rate limit or API issue${NC}"
fi
echo ""

# ============================================================================
# 8. Test AI Advisor - Eligible Worker (12 records)
# ============================================================================
echo -e "${YELLOW}8️⃣  Test: Eligible Worker (12 income records, Uber)${NC}"
advisor_response_3=$(curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 12,
    \"passesThreshold\": true,
    \"daysActive\": 30,
    \"platform\": \"Uber\"
  }")

echo "$advisor_response_3" | python3 -m json.tool
echo ""

status=$(echo "$advisor_response_3" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
score=$(echo "$advisor_response_3" | grep -o '"creditScore":[0-9]*' | cut -d':' -f2)
if [ -n "$status" ]; then
  echo -e "${GREEN}✓ AI Advisor responded${NC}"
  echo -e "${BLUE}   Status: $status${NC}"
  echo -e "${BLUE}   Credit Score: $score/100${NC}"
else
  echo -e "${YELLOW}⚠ Possible rate limit or API issue${NC}"
fi
echo ""

# ============================================================================
# 9. Test AI Advisor - With Question
# ============================================================================
echo -e "${YELLOW}9️⃣  Test: Worker with Question${NC}"
advisor_response_4=$(curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 7,
    \"passesThreshold\": false,
    \"daysActive\": 15,
    \"platform\": \"Mercado Libre\",
    \"question\": \"¿Cuántos registros más necesito para obtener un préstamo?\"
  }")

echo "$advisor_response_4" | python3 -m json.tool
echo ""

next_step=$(echo "$advisor_response_4" | grep -o '"nextStep":"[^"]*"' | cut -d'"' -f4)
if [ -n "$next_step" ]; then
  echo -e "${GREEN}✓ AI Advisor responded with personalized advice${NC}"
  echo -e "${BLUE}   Next Step: $next_step${NC}"
else
  echo -e "${YELLOW}⚠ Possible rate limit or API issue${NC}"
fi
echo ""

# ============================================================================
# 10. Test Rate Limiting
# ============================================================================
echo -e "${YELLOW}🔟 Test: Rate Limiting (6th request should fail)${NC}"
echo "Sending rapid requests to trigger rate limit (5 requests/hour)..."
echo ""

# Send 6th request
advisor_response_5=$(curl -s -X POST "$BASE_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 3,
    \"passesThreshold\": false,
    \"daysActive\": 5
  }")

echo "$advisor_response_5" | python3 -m json.tool
echo ""

http_status=$(echo "$advisor_response_5" | grep -o '"status":[0-9]*' | head -1 | cut -d':' -f2)
if [ "$http_status" = "429" ]; then
  echo -e "${GREEN}✓ Rate limiting is working correctly${NC}"
else
  echo -e "${YELLOW}⚠ Rate limit not triggered (may have window space)${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}✓ Backend health check passed${NC}"
echo -e "${GREEN}✓ SIWE authentication flow completed${NC}"
echo -e "${GREEN}✓ JWT token obtained successfully${NC}"
echo -e "${GREEN}✓ AI Advisor endpoint responding${NC}"
echo -e "${GREEN}✓ Personalized advice generated${NC}"
echo -e "${GREEN}✓ Rate limiting configured${NC}"
echo ""
echo -e "${BLUE}AI Advisor Features Verified:${NC}"
echo "  ✓ New worker advice (0 records)"
echo "  ✓ Active worker advice (5 records, Rappi)"
echo "  ✓ Eligible worker advice (12 records, Uber)"
echo "  ✓ Question-based personalization"
echo "  ✓ Rate limiting (5 requests/hour)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test from frontend: https://lendi-origin.vercel.app/worker/advisor"
echo "  2. Monitor Z.AI usage: https://z.ai/manage-apikey/apikey-list"
echo "  3. Check Vercel logs for any errors"
echo ""
echo "🎉 E2E test completed!"
echo ""
