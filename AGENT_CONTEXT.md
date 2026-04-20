# Lendi — Agent Context (actualizado: 2026-04-17)

> Léete esto completo antes de tocar cualquier archivo.  
> Contiene el estado real del proyecto, decisiones tomadas, problemas resueltos y pendientes.

---

## 1. Qué es este repo

Monorepo pnpm de **Lendi** — plataforma de crédito informal con privacidad FHE para LATAM.

```
lendi-origins/
  packages/
    app/        → Frontend React 19 + Vite + TanStack Router + ZeroDev
    backend/    → API REST Vercel Serverless (TypeScript, Clean Architecture)
    contracts/  → Contratos Solidity compilados (ABIs reales aquí)
  examples-passkey/zerodev-examples/  → Ejemplos Node.js ZeroDev (NO browser/passkey)
  CLAUDE.md           → Instrucciones base del proyecto
  AGENT_CONTEXT.md    → Este archivo
  vercel.json         → Config deploy frontend (raíz del monorepo)
```

---

## 2. URLs de producción

| Servicio | URL |
|----------|-----|
| **Frontend** | `https://lendi-origin.vercel.app` |
| **Backend** | `https://lendi-origins.vercel.app` |
| **Backend health** | `https://lendi-origins.vercel.app/api/health` |
| **Backend API docs** | `https://lendi-origins.vercel.app/api/v1/docs/openapi.json` |
| **Block explorer** | `https://sepolia.arbiscan.io` (Arbitrum Sepolia) |

---

## 3. Contratos on-chain (Arbitrum Sepolia, chainId 421614)

| Contrato | Address |
|----------|---------|
| LendiProof (InformalProof) | `0x809B8FC3C0e12f8F1b280E8A823294F98760fad4` |
| LendiProofGate (InformalProofGate) | `0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc` |
| LendiPolicy | `0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E` |
| USDC (Circle) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

ABIs reales compilados en: `packages/app/src/abi/` (lendi-proof.json, lendi-proof-gate.json, lendi-policy.json)  
Fuente de los ABIs: `packages/contracts/` (artefactos de Hardhat)

**CRÍTICO — `InEuint64` es una struct tuple, NO bytes32:**
```json
{ "components": [
  {"name":"ctHash","type":"uint256"},
  {"name":"securityZone","type":"uint8"},
  {"name":"utype","type":"uint8"},
  {"name":"signature","type":"bytes"}
], "type":"tuple" }
```

---

## 4. Stack técnico del frontend (`packages/app`)

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite 6 |
| Router | TanStack Router (code-based, NO file-based) |
| Auth wallet | ZeroDev ERC-4337 + WebAuthn passkeys |
| On-chain reads | viem 2.x (`publicClient` en `src/lib/viem-clients.ts`) |
| State | Zustand stores en `src/stores/` |
| Estilos | Tailwind CSS v4 + CSS vars (dark navy + lime) |
| i18n | `src/i18n/` — español primero, `as const` con `DeepStringify` |
| HTTP | axios en `src/http-client/HttpClient.ts` |

---

## 5. Autenticación — flujo completo

```
1. ZeroDev passkey (WebAuthn)  →  address
2. SIWE (Sign-In with Ethereum) →  nonce del backend → firma → JWT
3. JWT guardado en localStorage (access_token, refresh_token)
```

### Archivos clave de auth:
- `src/providers/zerodev/zerodev.provider.ts` — ZeroDev WebAuthn (register/login/signMessage)
- `src/hooks/use-auth.ts` — orquesta ZeroDev + SIWE
- `src/stores/wallet-store.ts` — estado de wallet
- `src/stores/auth-store.ts` — JWT tokens
- `src/services/AuthService.ts` — llamadas al backend `/v1/auth/wallet/*`
- `src/http-client/HttpClient.ts` — axios con interceptor JWT + refresh automático

### Variables de entorno ZeroDev (`packages/app/.env`):
```
VITE_ZERODEV_PROJECT_ID=d63cb121-bdd8-44b5-8098-e0c7205bc101
VITE_ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v3/d63cb121-bdd8-44b5-8098-e0c7205bc101/chain/421614
VITE_ZERODEV_PASSKEY_SERVER_URL=https://passkeys.zerodev.app/api/v3/d63cb121-bdd8-44b5-8098-e0c7205bc101
VITE_API_BASE_URL=   ← vacío en dev (usa proxy /api), en prod también vacío (rewrite en vercel.json)
VITE_CHAIN_ID=421614
VITE_COFHE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

---

## 6. Proxy API (cómo el frontend llama al backend sin CORS)

**Dev (Vite):** `vite.config.ts` → `/api` proxied a `https://lendi-origins.vercel.app`  
**Prod (Vercel):** `vercel.json` raíz → rewrite `/api/:path*` → `https://lendi-origins.vercel.app/api/:path*`

El `HttpClient` usa `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`.  
**NUNCA poner la URL del backend directamente** — siempre pasar por `/api` para evitar CORS.

---

## 7. Deploy

### Frontend
Desplegado desde la **raíz del monorepo** (no desde `packages/app`):
```bash
cd C:\Users\EleXc\Music\lend\lendi-origins
vercel --prod
```
Config en `vercel.json` (raíz):
- `buildCommand`: `pnpm --filter @lendi/app build`
- `outputDirectory`: `packages/app/dist`
- Rewrites: `/api/:path*` → backend, `/*` → `index.html` (SPA)
- Headers: `COOP: same-origin`, `COEP: require-corp` (requerido para WebAssembly/FHE)

### Backend
Ya desplegado en `https://lendi-origins.vercel.app`. Config en `packages/backend/vercel.json`.  
Serverless functions en `packages/backend/api/v1/...`

---

## 8. Estado actual — qué funciona y qué no

### ✅ Funciona
- Build (`pnpm build`) sin errores
- Deploy frontend a Vercel
- Backend API respondiendo (health check OK, nonce OK)
- Proxy `/api` → backend (sin CORS)
- Estructura de rutas (TanStack Router)
- Diseño visual (dark theme, componentes UI)
- i18n español/inglés

### 🔴 En debugging activo: Passkeys ZeroDev
**Síntoma:** Windows Hello abre, usuario pone PIN, Windows dice "Something went wrong", la promesa de WebAuthn se cuelga (no resuelve ni rechaza).

**Causa identificada:** `InvalidStateError` — Windows Hello ya tiene una passkey guardada para `lendi-origin.vercel.app` + ese userId de un intento anterior fallido. Crear otra con el mismo userId está prohibido por la spec WebAuthn.

**Fix para el usuario:**
1. Ir a **Windows Settings → Accounts → Passkeys**
2. Eliminar las passkeys de `lendi-origin.vercel.app`
3. Intentar registrar con username nuevo

**Fix en código** (ya implementado en `zerodev.provider.ts`):
- Catch de `InvalidStateError` con mensaje claro en español
- Timeout de 90s para que no quede colgado si el diálogo de Windows no cierra

### ⏳ Pendiente de implementar (fases Wave 2)
Ver `packages/app/WAVE2_FRONTEND (2).md` y `packages/app/FRONTEND_CLAUDE_CODE_PROMPT (1).md` para el plan completo.

Resumen de fases pendientes:
- **Fase 3:** CoFHE Privacy Layer — `useCofhe` hook, `EncryptionStep` component
- **Fase 4:** Worker Flow — `IncomeCapture`, `BalanceView`, `IncomeHistory` con `useLendiProof`
- **Fase 5:** Lender Flow — `VerifyIncome` con 3-step gate flow (requestVerification → publishVerification → isConditionMet)
- **Fase 6:** Income Auto-Capture — listener de pagos Reiniera
- **Fase 7:** Loan & Escrow Flow — `useLoanFlow`, `LoanApply`, `PortfolioTable`
- **Fase 8:** AI Advisor — `@mlc-ai/web-llm` local
- **Fase 9:** Integración backend completa
- **Fase 10:** Polish & móvil

---

## 9. Estructura de rutas (TanStack Router)

```
/                     → RolePickerPage (conectar wallet / elegir rol)
/worker               → WorkerDashboard (guard: requireAuth + WorkerOnboarding)
/worker/income        → IncomeCapture
/worker/apply         → LoanApply
/worker/advisor       → AIAdvisor
/lender               → LenderDashboard (guard: requireAuth)
/lender/verify        → VerifyIncome
/lender/portfolio     → Portfolio
```

Router en: `src/routeTree.gen.tsx`  
Layout raíz: `src/routes/__root.tsx` → `AppLayout` → `AppHeader` + `<Outlet>`

---

## 10. Flujo FHE (CoFHE) — 3 pasos para verificación de ingreso

```
1. Worker: recordIncome(InEuint64 encAmount)  →  LendiProof.sol
2. Lender: requestVerification(uint256 escrowId)  →  LendiProofGate.sol
3. Backend: off-chain decrypt + publishVerification(escrowId, bool, bytes)
4. Query: isConditionMet(escrowId) → bool
```

**IMPORTANTE:** `encAmount` es una struct tuple (ctHash, securityZone, utype, signature), NO bytes32.  
La encriptación usa `@cofhe/sdk/web` (NO `cofhejs` que está deprecado).  
Las operaciones FHE toman 10-30 segundos — la UX debe reflejarlo.

---

## 11. Decisiones de diseño tomadas (no revertir)

| Decisión | Razón |
|----------|-------|
| `KERNEL_V3_3` (no V3_1) | V3_1 deprecado en ZeroDev SDK actual |
| `PasskeyValidatorContractVersion.V0_0_3_PATCHED` | Versión correcta para Arbitrum Sepolia |
| Sin `rpID` explícito en `toWebAuthnKey` | El servidor de ZeroDev lo infiere del proyecto; pasarlo explícito rompió el registro |
| `DeepStringify<T>` en `i18n/es.ts` | `as const` + `Strings` type sería demasiado estricto para traducción inglés |
| `typeRoots: ["./node_modules/@types"]` en `tsconfig.node.json` | Evita que TS encuentre `@types/minimatch` transitivo del monorepo |
| Google Fonts import antes de `@import "tailwindcss"` en `main.css` | CSS ordering rule |
| Proxy Vite + Vercel rewrites para `/api` | Evita CORS sin hardcodear URL del backend |

---

## 12. Archivos críticos — mapa rápido

```
packages/app/
  src/
    providers/zerodev/zerodev.provider.ts   ← ZeroDev passkey (register/login)
    hooks/use-auth.ts                       ← SIWE flow
    hooks/use-contract-call.ts              ← wrapper viem para userOps
    stores/wallet-store.ts                  ← ZeroDev state
    stores/auth-store.ts                    ← JWT state
    config/contracts.ts                     ← addresses on-chain
    lib/viem-clients.ts                     ← publicClient para reads
    components/shared/WalletButton.tsx      ← UI de login/register
    components/shared/AppHeader.tsx         ← header con WalletButton
    components/shared/TxStatus.tsx          ← estado de txs (6 estados incl. FHE)
    components/worker/WorkerOnboarding.tsx  ← guard de registro on-chain
    routeTree.gen.tsx                       ← todas las rutas
    i18n/es.ts                              ← strings español (fuente de verdad)
  vercel.json      ← config deploy + CORS headers
  .env             ← credenciales ZeroDev (NO commitear)
  
packages/backend/
  api/v1/          ← Vercel serverless functions
  BACKEND_INTEGRATION.md  ← documentación completa de la API para el frontend
  VERCEL_ENV_VARS.txt     ← variables de entorno del backend

packages/contracts/
  artifacts/       ← ABIs compilados por Hardhat (fuente de verdad para ABIs)

vercel.json        ← raíz del monorepo — config build frontend para Vercel
WAVE2_FRONTEND (2).md          ← especificación técnica completa de Wave 2
FRONTEND_CLAUDE_CODE_PROMPT (1).md  ← plan de implementación por fases
BACKEND_INTEGRATION.md (en packages/app/) ← referencia de API endpoints
```

---

## 13. Comandos útiles

```bash
# Dev
pnpm dev:app          # frontend en localhost:4831
pnpm dev:backend      # backend local

# Build
pnpm --filter @lendi/app build    # build solo frontend
pnpm build                        # build todo

# Deploy
cd C:\Users\EleXc\Music\lend\lendi-origins
vercel --prod         # deploy frontend (desde raíz del monorepo)

# Test backend directo
curl https://lendi-origins.vercel.app/api/health
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x..."}'
```

---

## 14. Problema activo — debugging passkeys

Si el agente debe continuar debugging de passkeys:

1. `zerodev.provider.ts` ya tiene logs detallados en cada paso:
   - `[ZeroDev] register() — username:`
   - `[ZeroDev] /register/options status: 200 body:` (probe directo al servidor)
   - `[ZeroDev] register toWebAuthnKey OK/FAILED`
   - `[ZeroDev] toPasskeyValidator OK`
   - `[ZeroDev] account:` (address derivada)
   - `[ZeroDev] register OK — address:`

2. El servidor de ZeroDev responde correctamente:
   - `rp.id: "lendi-origin.vercel.app"` ✅
   - `rp.name: "lendi-origin.vercel.app"` ✅
   - `authenticatorSelection.userVerification: "required"`
   - `authenticatorSelection.residentKey: "required"`

3. El problema es `InvalidStateError` — passkey residual en Windows Hello.  
   **El código ya maneja este error** y muestra mensaje en español.  
   **El usuario debe:** Windows Settings → Accounts → Passkeys → borrar `lendi-origin.vercel.app`.

4. Si el problema persiste después de borrar passkeys, verificar:
   - ZeroDev dashboard: proyecto `d63cb121-bdd8-44b5-8098-e0c7205bc101` tiene `lendi-origin.vercel.app` como allowed origin
   - `KERNEL_V3_3` sigue siendo la versión correcta (verificar changelog ZeroDev)
   - `@zerodev/webauthn-key` usa `@simplewebauthn/browser@9.0.1` internamente

---

## 15. Lo que NO debes hacer

- **NO pasar `rpID` explícito** a `toWebAuthnKey` — el servidor ZeroDev lo infiere del proyecto y pasarlo manualmente rompió el registro
- **NO usar `cofhejs`** — está deprecado, usar `@cofhe/sdk/web`  
- **NO usar `KERNEL_V3_1`** — deprecado  
- **NO cambiar `PasskeyValidatorContractVersion`** sin verificar en la doc de ZeroDev
- **NO hardcodear la URL del backend** — siempre usar `/api` como base
- **NO agregar `ripID` param** a `toWebAuthnKey` sin primero verificar en el ZeroDev dashboard que el dominio está configurado como allowed origin
- **NO hacer `cd ../..`** en comandos de install de Vercel — ya está corregido en ambos `vercel.json`
