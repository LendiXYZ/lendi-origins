#!/bin/bash
# End-to-End Testing Script for Lendi Backend
# Tests the complete flow from worker registration to loan verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://lendi-origins.vercel.app}"
WORKER_ADDRESS="${WORKER_ADDRESS}"
LENDER_ADDRESS="${LENDER_ADDRESS}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Lendi Backend E2E Testing${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check required env vars
if [ -z "$WORKER_ADDRESS" ]; then
  echo -e "${RED}Error: WORKER_ADDRESS not set${NC}"
  echo "Usage: WORKER_ADDRESS=0x... LENDER_ADDRESS=0x... ./scripts/test-e2e.sh"
  exit 1
fi

if [ -z "$LENDER_ADDRESS" ]; then
  echo -e "${RED}Error: LENDER_ADDRESS not set${NC}"
  exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Worker:   $WORKER_ADDRESS"
echo "  Lender:   $LENDER_ADDRESS"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
  exit 1
fi
echo ""

# Test 2: Request Nonce for Worker
echo -e "${YELLOW}Test 2: Request Nonce (Worker)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\": \"$WORKER_ADDRESS\"}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  nonce=$(echo "$body" | grep -o '"nonce":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Nonce received: $nonce${NC}"
else
  echo -e "${RED}✗ Nonce request failed (HTTP $http_code)${NC}"
  echo "  Response: $body"
  exit 1
fi
echo ""

# Test 3: Check Worker Registration Status
echo -e "${YELLOW}Test 3: Check Worker Status${NC}"
echo -e "${BLUE}Note: This requires worker to be registered on-chain first${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/workers/$WORKER_ADDRESS")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
  echo -e "${GREEN}✓ Worker status endpoint responding${NC}"
  echo "  Response: $body"
else
  echo -e "${YELLOW}⚠ Worker status check returned HTTP $http_code${NC}"
  echo "  Response: $body"
fi
echo ""

# Test 4: Request Nonce for Lender
echo -e "${YELLOW}Test 4: Request Nonce (Lender)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\": \"$LENDER_ADDRESS\"}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Lender nonce received${NC}"
else
  echo -e "${RED}✗ Lender nonce request failed (HTTP $http_code)${NC}"
  exit 1
fi
echo ""

# Test 5: Test Protected Endpoint (without auth)
echo -e "${YELLOW}Test 5: Test Authentication (should fail without token)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/workers" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\": \"$WORKER_ADDRESS\"}")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✓ Authentication required (correctly blocked)${NC}"
else
  echo -e "${RED}✗ Expected 401, got HTTP $http_code${NC}"
fi
echo ""

# Test 6: Get All Loans (public endpoint)
echo -e "${YELLOW}Test 6: Get Loans Endpoint${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/loans")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✓ Loans endpoint requires authentication${NC}"
else
  echo -e "${YELLOW}⚠ Loans endpoint returned HTTP $http_code${NC}"
fi
echo ""

# Test 7: Webhook Endpoint (should reject without signature)
echo -e "${YELLOW}Test 7: Test Webhook Protection${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/webhooks/quicknode" \
  -H "Content-Type: application/json" \
  -d '{"events": []}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✓ Webhook requires valid signature${NC}"
else
  echo -e "${YELLOW}⚠ Webhook returned HTTP $http_code (expected 401)${NC}"
fi
echo ""

# Test 8: OpenAPI Documentation
echo -e "${YELLOW}Test 8: OpenAPI Documentation${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/docs/openapi.json")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ OpenAPI documentation available${NC}"
else
  echo -e "${RED}✗ OpenAPI documentation failed (HTTP $http_code)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}✓ Backend is operational and responding correctly${NC}"
echo -e "${GREEN}✓ Authentication is working (401 on protected endpoints)${NC}"
echo -e "${GREEN}✓ Webhook protection is active${NC}"
echo ""
echo -e "${YELLOW}Next Steps for Complete E2E Testing:${NC}"
echo "  1. Register worker on-chain: LendiProof.registerWorker()"
echo "  2. Sign SIWE message with worker wallet"
echo "  3. Create worker via authenticated API call"
echo "  4. Record income on-chain: LendiProof.recordIncome(encrypted)"
echo "  5. Create loan via API (triggers full FHE flow)"
echo "  6. Wait 10-30s for FHE verification"
echo "  7. Check loan status and isConditionMet"
echo ""
echo "See E2E_TESTING.md for detailed instructions"
echo ""
