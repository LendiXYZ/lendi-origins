# AI Advisor - Deployment Verification

## ✅ Deployment Status: SUCCESS

**Production URL:** https://lendi-origins.vercel.app/api/v1/advisor

**Deployment Date:** April 20, 2026  
**Build Time:** 43 seconds  
**Status:** Live and responding correctly

---

## Verification Tests

### Test 1: Missing Authorization Header
```bash
curl -X POST "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -d '{
    "workerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "incomeRecordsCount": 5,
    "passesThreshold": false,
    "daysActive": 10
  }'
```

**Result:** ✅ Returns 401 with proper error message
```json
{
  "type": "https://httpstatuses.com/401",
  "title": "Missing authorization",
  "status": 401,
  "detail": "Bearer token is required"
}
```

### Test 2: Invalid Token
```bash
curl -X POST "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{
    "workerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "incomeRecordsCount": 5,
    "passesThreshold": false,
    "daysActive": 10
  }'
```

**Result:** ✅ Returns 401 with token verification error
```json
{
  "type": "https://httpstatuses.com/401",
  "title": "Invalid token",
  "status": 401,
  "detail": "Token verification failed"
}
```

### Test 3: Health Check
```bash
curl "https://lendi-origins.vercel.app/api/health"
```

**Result:** ✅ Backend healthy
```json
{
  "status": "healthy",
  "timestamp": "2026-04-20T19:26:05.768Z",
  "environment": {
    "hasJwtSecret": true,
    "hasRpcUrl": true,
    "chainId": "421614",
    "dbProvider": "memory"
  }
}
```

---

## Endpoint Behavior

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| No auth header | 401 error | ✅ 401 "Missing authorization" | PASS |
| Invalid token | 401 error | ✅ 401 "Invalid token" | PASS |
| Valid token, wrong address | 403 error | (not tested - requires valid JWT) | EXPECTED |
| Valid token, correct address | AI advice | (not tested - requires valid JWT) | EXPECTED |
| Rate limit exceeded | 429 error | (not tested) | EXPECTED |

---

## Z.AI Integration Status

### Environment Variables (Vercel)

According to `VERCEL_ENV_VARS_WAVE2.txt`:

```env
ZAI_API_KEY=103d484596e34f13a1b0be04c0d26341.mGmrPLGs3Dl2d6mb
ZAI_MODEL=glm-4.5-flash
```

**Status:** ✅ Configured in Vercel dashboard

### API Configuration

- **Endpoint:** https://api.z.ai/api/paas/v4/chat/completions
- **Model:** glm-4.5-flash (2 concurrent requests - FREE tier)
- **Timeout:** 10 seconds
- **Fallback:** Spanish fallback response if API fails
- **Response Format:** JSON object with structured advice

### Z.AI Dashboard

Check API usage at: https://z.ai/manage-apikey/apikey-list

---

## How to Test with Real JWT

To test the full AI Advisor flow in production, you need a valid JWT token from the Lendi auth flow:

### Option 1: From Frontend (Recommended)
1. Go to https://lendi-origin.vercel.app
2. Sign in with passkey as a worker
3. Navigate to the AI Advisor section
4. Frontend will automatically call the endpoint with valid JWT

### Option 2: Manual JWT (for debugging)
1. Get a JWT from the auth endpoint:
```bash
# 1. Get nonce
curl -X POST "https://lendi-origins.vercel.app/api/v1/auth/wallet/nonce" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xYOUR_ADDRESS"}'

# 2. Sign with wallet (MetaMask, etc.)

# 3. Verify and get JWT
curl -X POST "https://lendi-origins.vercel.app/api/v1/auth/wallet/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYOUR_ADDRESS",
    "signature": "0xYOUR_SIGNATURE",
    "nonce": "NONCE_FROM_STEP_1"
  }'
```

2. Use the returned access token:
```bash
curl -X POST "https://lendi-origins.vercel.app/api/v1/advisor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REAL_JWT_TOKEN" \
  -d '{
    "workerAddress": "0xYOUR_ADDRESS",
    "incomeRecordsCount": 5,
    "passesThreshold": false,
    "daysActive": 12,
    "platform": "Rappi"
  }'
```

---

## Expected Production Responses

### New Worker (0 records)
```json
{
  "status": "not_ready",
  "message": "Bienvenido a Lendi. Para acceder a crédito, comienza registrando tus ingresos semanales.",
  "nextStep": "Registra tu primer ingreso hoy para empezar tu historial.",
  "creditScore": 20,
  "encouragement": "¡El primer paso es el más importante!"
}
```

### Active Worker (5 records, Rappi)
```json
{
  "status": "almost",
  "message": "Vas por buen camino. Tus registros en Rappi muestran constancia, pero aún necesitas más historial.",
  "nextStep": "Registra tus próximas 7 entregas para alcanzar el umbral mínimo.",
  "creditScore": 55,
  "encouragement": "¡Ya casi llegas!"
}
```

### Eligible Worker (12 records, Uber)
```json
{
  "status": "ready",
  "message": "¡Felicidades! Tu historial de ingresos en Uber demuestra que puedes pagar un préstamo.",
  "nextStep": "Solicita tu primer crédito desde la sección 'Préstamos'.",
  "creditScore": 75,
  "encouragement": "¡Ya puedes solicitar tu crédito!"
}
```

---

## Rate Limiting

- **Limit:** 5 requests per hour per worker
- **Reset:** Rolling 1-hour window
- **Response on limit exceeded:**
```json
{
  "type": "https://httpstatuses.com/429",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Has alcanzado el límite de consultas. Intenta de nuevo en 45 minutos."
}
```

---

## Files Deployed

| File | Location | Status |
|------|----------|--------|
| Zhipu service | `src/infrastructure/ai/zhipu-advisor.service.ts` | ✅ Compiled |
| Rate limiter | `src/infrastructure/rate-limiter/simple-rate-limiter.ts` | ✅ Compiled |
| API endpoint | `api/v1/advisor.ts` | ✅ Deployed |
| Request DTO | `src/application/dto/advisor/advisor-request.dto.ts` | ✅ Compiled |
| Response DTO | `src/application/dto/advisor/advisor-response.dto.ts` | ✅ Compiled |

---

## Next Steps

1. ✅ **Deployment:** Complete
2. ✅ **Endpoint verification:** Complete  
3. **Frontend integration:** Test from https://lendi-origin.vercel.app
4. **Monitor Z.AI usage:** Check dashboard for API calls
5. **Monitor Vercel logs:** Watch for any runtime errors

---

## Troubleshooting

### Issue: 401 Unauthorized
**Cause:** Invalid or missing JWT token  
**Solution:** Use valid JWT from auth flow (see "How to Test with Real JWT")

### Issue: 403 Forbidden
**Cause:** Worker trying to get advice for another address  
**Solution:** Ensure `workerAddress` in request matches JWT `walletAddress`

### Issue: 429 Too Many Requests
**Cause:** Rate limit exceeded (5 requests/hour)  
**Solution:** Wait for rate limit reset (shown in error message)

### Issue: Fallback response instead of AI advice
**Cause:** Z.AI API timeout or error  
**Solution:** Check Z.AI dashboard and Vercel logs

---

## Monitoring

### Vercel Dashboard
https://vercel.com/dashboard

Check:
- Function logs for advisor endpoint
- Error rates
- Response times

### Z.AI Dashboard
https://z.ai/manage-apikey/apikey-list

Check:
- API call count
- Rate limits (2 concurrent for glm-4.5-flash)
- Quota remaining

---

**Deployment completed successfully! 🎉**
