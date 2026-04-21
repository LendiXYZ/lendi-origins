#!/bin/bash

echo "🔍 Verificando que el endpoint existe y responde correctamente..."
echo ""
echo "Test 1: Sin Authorization header (debe dar 401)"
curl -s -X POST "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -d '{
    "workerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "incomeRecordsCount": 5,
    "passesThreshold": false,
    "daysActive": 10
  }' | python3 -m json.tool

echo ""
echo "Test 2: Con token inválido (debe dar 401)"
curl -s -X POST "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{
    "workerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "incomeRecordsCount": 5,
    "passesThreshold": false,
    "daysActive": 10
  }' | python3 -m json.tool

echo ""
echo "Test 3: Health check (debe dar 200)"
curl -s "https://lendi-origins.vercel.app/api/health" | python3 -m json.tool
