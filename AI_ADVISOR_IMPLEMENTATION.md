# AI Advisor Implementation - Lendi

## Overview

The AI Advisor is an intelligent feature that provides personalized credit advice to informal workers in Spanish using **Zhipu AI's GLM-4.5** model via the Z.AI API. It analyzes worker data **without revealing actual income amounts**, maintaining Lendi's privacy-first approach.

## Architecture

```
Frontend (React)          Backend (Node.js)           External API
─────────────────         ──────────────────          ─────────────

AIAdvisor.tsx    ──────>  POST /api/v1/advisor  ────>  Z.AI GLM-4.5
     │                           │                           │
     │                           │                           │
     └── useWorkerMetrics        └── ZhipuAdvisorService ────┘
                                      │
                                      └── Rate Limiter (5/hour)
```

## Files Created

### Backend

1. **Types & DTOs**
   - `src/application/dto/advisor/advisor-request.dto.ts` - Request schema
   - `src/application/dto/advisor/advisor-response.dto.ts` - Response schema

2. **Services**
   - `src/infrastructure/ai/zhipu-advisor.service.ts` - Z.AI integration
   - `src/infrastructure/rate-limiter/simple-rate-limiter.ts` - In-memory rate limiting

3. **API Routes**
   - `api/v1/advisor.ts` - POST endpoint with auth & rate limiting

4. **Response Helpers**
   - Updated `src/interface/response.ts` with `forbidden()` and `tooManyRequests()`

### Frontend

1. **Components**
   - `src/components/worker/AIAdvisor.tsx` - Main UI component with credit score visualization

2. **Services**
   - `src/services/AdvisorService.ts` - HTTP client for advisor API

3. **Hooks**
   - `src/hooks/useWorkerMetrics.ts` - Fetches worker data for advisor

4. **Routes**
   - Updated `src/routes/worker/advisor.tsx` - Integrated AIAdvisor component

## Environment Variables

Add to `packages/backend/.env`:

```env
# Z.AI (Zhipu AI) - AI Advisor
ZAI_API_KEY=zai-xxxxxxxxxxxxx
ZAI_MODEL=glm-4.5-flash   # Use glm-4.5 for production/demo (10 concurrent requests)
```

### Getting Your API Key

1. Visit [https://open.bigmodel.cn/usercenter/apikeys](https://open.bigmodel.cn/usercenter/apikeys)
2. Create an account or sign in
3. Generate a new API key
4. Copy and paste into `.env` file

### Model Selection

- **Development**: `glm-4.5-flash` (FREE tier, 2 concurrent requests)
- **Production/Demo**: `glm-4.5` (10 concurrent requests - handles multiple judges reviewing)
- **Why not GLM-5.1?**: Only 1 concurrent request - would rate limit during demos

## API Specification

### POST /api/v1/advisor

**Authentication**: Required (JWT Bearer token)

**Rate Limit**: 5 requests per worker per hour

**Request Body**:
```json
{
  "workerAddress": "0x1234...",
  "incomeRecordsCount": 8,
  "passesThreshold": true,
  "daysActive": 15,
  "platform": "Rappi",
  "question": "¿Cuántos registros más necesito?"
}
```

**Response (200 OK)**:
```json
{
  "status": "ready",
  "message": "Tu historial es sólido. Puedes solicitar préstamos con confianza.",
  "nextStep": "Solicita un préstamo en la sección 'Aplicar'.",
  "creditScore": 85,
  "encouragement": "¡Excelente trabajo construyendo tu historial!"
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Worker requesting advice for different address
- `422 Unprocessable Entity` - Invalid request data
- `429 Too Many Requests` - Rate limit exceeded (Spanish message)

## Privacy Model

### What the AI Advisor NEVER Sees:
- ❌ Actual income amounts
- ❌ Bank account details
- ❌ Transaction history
- ❌ Employer information
- ❌ Encrypted income ciphertexts

### What the AI Advisor RECEIVES:
- ✅ Number of income records (count only)
- ✅ Boolean threshold result (passes/doesn't pass)
- ✅ Days active on platform
- ✅ Platform name (e.g., "Rappi", "Uber")
- ✅ Optional follow-up questions

This maintains Lendi's **zero-knowledge income verification** promise.

## Component Props

### AIAdvisor

```tsx
interface AIAdvisorProps {
  workerAddress: string;      // Worker's wallet address
  incomeRecordsCount: number; // Number of income proofs registered
  passesThreshold: boolean;   // FHE threshold verification result
  daysActive: number;         // Days since first income record
  platform?: string;          // "Rappi" | "Uber" | "Mercado Libre" | etc.
}
```

## UI Features

### Credit Score Visualization
- Circular progress ring (1-100 scale)
- Color-coded status:
  - 🟢 **Green** (ready): Score > 70, ready for loans
  - 🟡 **Yellow** (almost): Score 40-70, building history
  - 🔴 **Red** (not_ready): Score < 40, needs more records

### Spanish-First Copy
- All text in Spanish (informal "tú" form)
- Empathetic, direct, and practical advice
- No financial jargon
- Maximum 3 sentences per field

### Interactive Features
- **Auto-refresh**: Re-fetches advice when `incomeRecordsCount` changes
- **Follow-up questions**: Workers can ask custom questions
- **Loading states**: Animated skeleton while waiting for GLM-4.5
- **Error handling**: Graceful fallback responses on API errors

## Testing

### Manual Testing Flow

1. **Start Backend**:
   ```bash
   cd packages/backend
   pnpm dev
   ```

2. **Start Frontend**:
   ```bash
   cd packages/app
   pnpm dev
   ```

3. **Test Cases**:

   **Case 1: New Worker (0 records)**
   - Navigate to `/worker/advisor`
   - Expected: `not_ready` status, score < 30
   - Message: "Construyendo tu historial..."

   **Case 2: Active Worker (5 records, no threshold)**
   - Register 5 income proofs
   - Expected: `almost` status, score 40-60
   - Message: "Estás en buen camino..."

   **Case 3: Eligible Worker (10+ records, passes threshold)**
   - Register 10+ income proofs
   - Expected: `ready` status, score > 70
   - Message: "Listo para solicitar préstamos"

   **Case 4: Rate Limit**
   - Make 6 requests within 1 hour
   - Expected: 429 error with Spanish message
   - Message: "Has alcanzado el límite de consultas..."

   **Case 5: Follow-up Question**
   - Ask: "¿Cuántos registros más necesito?"
   - Expected: Personalized response incorporating question

   **Case 6: API Timeout/Error**
   - Stop backend or invalid API key
   - Expected: Fallback response shown
   - No error surfaced to user

## Fallback Response

If Z.AI API fails (timeout, rate limit, invalid key, parsing error), the system returns:

```json
{
  "status": "almost",
  "message": "Estás construyendo tu historial crediticio. Sigue registrando tus ingresos.",
  "nextStep": "Registra tus ingresos de esta semana en Lendi.",
  "creditScore": 50,
  "encouragement": "¡Cada registro cuenta!"
}
```

This ensures the user experience is never broken.

## Production Deployment

### Backend (Vercel)

1. Add environment variables in Vercel dashboard:
   ```
   ZAI_API_KEY=zai-xxxxxxxxxxxxx
   ZAI_MODEL=glm-4.5
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

### Frontend (Vercel)

No additional configuration needed - uses existing `VITE_API_BASE_URL`.

### Rate Limiting (Production)

For production, consider upgrading from in-memory to Redis:

```typescript
// src/infrastructure/rate-limiter/redis-rate-limiter.ts
import Redis from 'ioredis';

export class RedisRateLimiter {
  private redis: Redis;

  constructor(private maxRequests: number, private windowMs: number) {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async check(key: string): Promise<boolean> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, this.windowMs);
    }
    return count <= this.maxRequests;
  }
}
```

## Demo Narration (Pitch Angle)

> "Sebastián no sabe qué es un 'score crediticio'. Él sabe si puede pagar la renta este mes.
>
> El AI Advisor de Lendi habla su idioma — le dice exactamente qué hacer **hoy** para acceder al crédito **mañana**.
>
> Sin revelar cuánto gana. Nunca."

## Future Enhancements

### Phase 2: On-Chain FHE Verification
- Call `LendiProofGate.isConditionMet()` for real threshold checks
- Replace heuristic `passesThreshold` with actual FHE results

### Phase 3: Multi-Language Support
- Add Portuguese, English translations
- Detect browser language or user preference

### Phase 4: Advanced Analytics
- Track which advice leads to successful loans
- A/B test different advice strategies
- Fine-tune GLM prompts based on outcomes

### Phase 5: WebLLM Fallback
- Integrate `@mlc-ai/web-llm` for offline advisor
- Use Llama-3.2-3B-Instruct for privacy-first local inference
- Zero server calls for maximum privacy

## Troubleshooting

### Issue: "ZAI_API_KEY not set" warning

**Solution**: Add `ZAI_API_KEY` to `packages/backend/.env`

### Issue: 429 Rate Limit from Z.AI

**Symptoms**: All requests return fallback response
**Solution**:
1. Check Z.AI dashboard for quota limits
2. Upgrade to paid plan if needed
3. Switch to `glm-4.5-flash` for FREE tier

### Issue: TypeScript errors in AIAdvisor.tsx

**Symptoms**: `Property 'variant' does not exist on type 'ButtonProps'`
**Solution**: Verify `Button` component supports `variant="secondary"` or remove prop

### Issue: Worker metrics show 0 records despite registrations

**Symptoms**: `incomeRecordsCount: 0` even after capturing income
**Solution**:
1. Check backend JWT authentication is working
2. Verify `IncomeEventService.getByWorker()` is called successfully
3. Ensure worker ID matches between frontend and backend

## License

MIT - Part of Lendi project

---

**Built with:**
- Zhipu AI GLM-4.5 (Z.AI API)
- React 19 + TypeScript
- Node.js + Express
- Zod for validation
- Tailwind CSS for styling

**Maintained by:** Lendi Team
**Last Updated:** 2026-04-20
