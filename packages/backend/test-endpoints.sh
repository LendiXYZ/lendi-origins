#!/bin/bash

BASE_URL="https://lendi-origins.vercel.app"

echo "========================================="
echo "TESTING ALL API ENDPOINTS"
echo "========================================="
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local description=$3

    echo "Testing: $method $path"
    echo "Description: $description"

    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X $method "$BASE_URL$path" 2>&1)
    http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')

    echo "Status: $http_code"
    if [ ${#body} -gt 200 ]; then
        echo "Body: ${body:0:200}..."
    else
        echo "Body: $body"
    fi
    echo "---"
    echo ""
}

echo "=== ROOT & HEALTH ==="
test_endpoint "GET" "/api" "API root"
test_endpoint "GET" "/api/health" "Health check"
test_endpoint "GET" "/api/debug-env" "Debug environment"

echo ""
echo "=== AUTH ENDPOINTS ==="
test_endpoint "POST" "/api/v1/auth/wallet/nonce" "Request nonce"
test_endpoint "POST" "/api/v1/auth/wallet/verify" "Verify wallet signature"
test_endpoint "DELETE" "/api/v1/auth/tokens" "Logout"
test_endpoint "POST" "/api/v1/auth/tokens/refresh" "Refresh token"

echo ""
echo "=== WORKERS ==="
test_endpoint "GET" "/api/v1/workers" "List workers"
test_endpoint "POST" "/api/v1/workers" "Create worker"
test_endpoint "GET" "/api/v1/workers/123" "Get worker by ID"

echo ""
echo "=== LENDERS ==="
test_endpoint "GET" "/api/v1/lenders" "List lenders"
test_endpoint "POST" "/api/v1/lenders" "Create lender"
test_endpoint "GET" "/api/v1/lenders/123" "Get lender by ID"

echo ""
echo "=== ESCROWS ==="
test_endpoint "GET" "/api/v1/escrows" "List escrows"
test_endpoint "POST" "/api/v1/escrows" "Create escrow"
test_endpoint "GET" "/api/v1/escrows/test123" "Get escrow by ID"
test_endpoint "GET" "/api/v1/public/escrows/test123" "Get public escrow"

echo ""
echo "=== LOANS ==="
test_endpoint "GET" "/api/v1/loans" "List loans"
test_endpoint "POST" "/api/v1/loans" "Create loan"
test_endpoint "GET" "/api/v1/loans/123" "Get loan by ID"

echo ""
echo "=== WITHDRAWALS ==="
test_endpoint "GET" "/api/v1/withdrawals" "List withdrawals"
test_endpoint "POST" "/api/v1/withdrawals" "Create withdrawal"
test_endpoint "GET" "/api/v1/withdrawals/test123" "Get withdrawal"
test_endpoint "GET" "/api/v1/withdrawals/test123/bridge-readiness" "Check bridge readiness"
test_endpoint "POST" "/api/v1/withdrawals/test123/bridge-challenge" "Create bridge challenge"

echo ""
echo "=== INCOME EVENTS ==="
test_endpoint "GET" "/api/v1/income-events" "List income events"
test_endpoint "POST" "/api/v1/income-events" "Create income event"
test_endpoint "GET" "/api/v1/income-events/123" "Get income event"

echo ""
echo "=== BUSINESS PROFILES ==="
test_endpoint "POST" "/api/v1/business-profiles" "Create business profile"

echo ""
echo "=== API CREDENTIALS ==="
test_endpoint "POST" "/api/v1/api-credentials" "Create API credentials"
test_endpoint "DELETE" "/api/v1/api-credentials/test123" "Delete API credentials"
test_endpoint "POST" "/api/v1/api-credentials/oauth/token" "OAuth token exchange"

echo ""
echo "=== USER ==="
test_endpoint "GET" "/api/v1/users/me" "Get current user"

echo ""
echo "=== BALANCE ==="
test_endpoint "GET" "/api/v1/balance" "Get balance"

echo ""
echo "=== TRANSACTIONS ==="
test_endpoint "POST" "/api/v1/transactions/escrows/report" "Report escrow transaction"
test_endpoint "POST" "/api/v1/transactions/withdrawals/report" "Report withdrawal transaction"

echo ""
echo "=== WEBHOOKS ==="
test_endpoint "POST" "/api/v1/webhooks/quicknode" "QuickNode webhook"
test_endpoint "POST" "/api/v1/webhooks/relay-callback" "Relay callback"

echo ""
echo "=== DOCS ==="
test_endpoint "GET" "/api/v1/docs/openapi.json" "OpenAPI documentation"

echo ""
echo "========================================="
echo "TESTING COMPLETE"
echo "========================================="
