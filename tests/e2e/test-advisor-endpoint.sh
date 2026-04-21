#!/bin/bash

# Script de prueba para AI Advisor endpoint
# Genera un JWT mock y prueba el endpoint /api/v1/advisor

echo "🧪 Testing AI Advisor Endpoint"
echo "================================"
echo ""

# Dirección del worker de prueba
WORKER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
BACKEND_URL="http://localhost:3000"

# Generar JWT mock usando Node.js
echo "📝 Generando JWT de prueba..."

JWT_TOKEN=$(node -e "
const { SignJWT } = require('jose');

async function generateToken() {
  const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-chars-long-for-local-development');

  const jwt = await new SignJWT({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
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
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
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

# Test Case 4: Con pregunta
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 4: Worker con Pregunta"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 7,
    \"passesThreshold\": false,
    \"daysActive\": 15,
    \"platform\": \"Mercado Libre\",
    \"question\": \"¿Cuántos registros más necesito para obtener un préstamo?\"
  }" | python3 -m json.tool

echo ""
echo ""

# Test Case 5: Sin JWT (debe fallar)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 5: Sin JWT (debe dar 401)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -d "{
    \"workerAddress\": \"$WORKER_ADDRESS\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 10
  }" | python3 -m json.tool

echo ""
echo ""

# Test Case 6: Worker diferente (debe dar 403)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 6: Worker solicitando para otra address (debe dar 403)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$BACKEND_URL/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"workerAddress\": \"0x0000000000000000000000000000000000000000\",
    \"incomeRecordsCount\": 5,
    \"passesThreshold\": false,
    \"daysActive\": 10
  }" | python3 -m json.tool

echo ""
echo "🎉 Tests completados!"
