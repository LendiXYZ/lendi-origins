#!/bin/bash

# Test CORS Headers - Verify X-PAYMENT is allowed
# Tests PIECE 2 - CORS Fix

BASE_URL="${BASE_URL:-https://lendi-origins.vercel.app}"

echo ""
echo "🔍 Test CORS Headers - X-PAYMENT Support"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "Backend: $BASE_URL"
echo ""

# Test 1: OPTIONS request (CORS preflight)
echo "1️⃣  Testing CORS preflight (OPTIONS request)..."
echo ""

RESPONSE=$(curl -s -i -X OPTIONS "$BASE_URL/api/v1/advisor" \
  -H "Origin: https://lendi-origin.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-PAYMENT")

echo "Response:"
echo "$RESPONSE"
echo ""

# Extract headers
ALLOW_ORIGIN=$(echo "$RESPONSE" | grep -i "Access-Control-Allow-Origin:" | cut -d' ' -f2- | tr -d '\r')
ALLOW_METHODS=$(echo "$RESPONSE" | grep -i "Access-Control-Allow-Methods:" | cut -d' ' -f2- | tr -d '\r')
ALLOW_HEADERS=$(echo "$RESPONSE" | grep -i "Access-Control-Allow-Headers:" | cut -d' ' -f2- | tr -d '\r')

echo "Extracted Headers:"
echo "  Access-Control-Allow-Origin: $ALLOW_ORIGIN"
echo "  Access-Control-Allow-Methods: $ALLOW_METHODS"
echo "  Access-Control-Allow-Headers: $ALLOW_HEADERS"
echo ""

# Verify X-PAYMENT is in allowed headers
if echo "$ALLOW_HEADERS" | grep -qi "X-PAYMENT"; then
  echo "✅ X-PAYMENT header is allowed in CORS"
else
  echo "❌ X-PAYMENT header is NOT allowed in CORS"
  echo "   Expected: Content-Type, Authorization, X-PAYMENT"
  echo "   Got: $ALLOW_HEADERS"
  exit 1
fi
echo ""

# Test 2: Verify other required headers still work
echo "2️⃣  Verifying other CORS headers..."
echo ""

if echo "$ALLOW_HEADERS" | grep -qi "Content-Type"; then
  echo "✅ Content-Type header is allowed"
else
  echo "❌ Content-Type header is missing"
  exit 1
fi

if echo "$ALLOW_HEADERS" | grep -qi "Authorization"; then
  echo "✅ Authorization header is allowed"
else
  echo "❌ Authorization header is missing"
  exit 1
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST SUMMARY - CORS Headers"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "✅ CORS preflight (OPTIONS) working"
echo "✅ X-PAYMENT header allowed (PIECE 2 complete)"
echo "✅ Content-Type header allowed"
echo "✅ Authorization header allowed"
echo ""
echo "🎉 PIECE 2 - CORS Fix is 100% functional!"
echo ""
echo "Now x402 payments can send the X-PAYMENT header without CORS errors."
echo ""
