#!/bin/bash

# Script de prueba para AI Advisor endpoint en PRODUCCIÓN
# URL: https://lendi-origins.vercel.app

echo "🚀 Testing AI Advisor Endpoint - PRODUCTION"
echo "============================================="
echo "Backend: https://lendi-origins.vercel.app"
echo ""

# Dirección del worker de prueba
WORKER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
BACKEND_URL="https://lendi-origins.vercel.app"

# Generar JWT mock usando Node.js
echo "📝 Generando JWT de prueba..."

JWT_TOKEN=$(node -e "
const { SignJWT } = require('jose');

async function generateToken() {
  const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-chars-long-for-local-development');

  const jwt = await new SignJWT({
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    role: 'worker'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('lendi-api')
    .setExpirationTime('2h')
    .sign(secret);

  console.log(jwt);
}

generateToken();
" 2>/dev/null)

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Error: No se pudo generar el JWT"
  echo "Instalando dependencia 'jose'..."
  cd packages/backend
  npm install jose
  cd ../..

  # Reintentar
  JWT_TOKEN=$(node -e "
  const { SignJWT } = require('jose');

  async function generateToken() {
    const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-chars-long-for-local-development');

    const jwt = await new SignJWT({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      role: 'worker'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('lendi-api')
      .setExpirationTime('2h')
      .sign(secret);

    console.log(jwt);
  }

  generateToken();
  " 2>/dev/null)
fi

echo "✅ JWT generado: ${JWT_TOKEN:0:50}..."
echo ""

# Test Case 1: Worker nuevo (not_ready)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 1: Worker Nuevo (0 registros)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 0,
    \"passesThreshold\": false,
    \"daysActive\": 0
  }" | python3 -m json.tool

echo ""
echo ""

# Test Case 2: Worker activo (almost)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 2: Worker Activo (5 registros, Rappi)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 12,
    \"platform\": \"Rappi\"
  }" | python3 -m json.tool

echo ""
echo ""

# Test Case 3: Worker elegible (ready)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 3: Worker Elegible (12 registros, Uber)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 12,
    \"passesThreshold\": true,
    \"daysActive\": 30,
    \"platform\": \"Uber\"
  }" | python3 -m json.tool

echo ""
echo ""

echo "🎉 Tests de producción completados!"
echo ""
echo "Verifica en Vercel logs si hubo llamadas a Z.AI API:"
echo "https://vercel.com/dashboard"
