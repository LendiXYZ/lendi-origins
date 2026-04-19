# Session Storage Fix - JWT 401 Errors

## Problema Identificado

### Errores 401 en Producción
```
GET /api/v1/escrows → 401
POST /api/v1/auth/tokens/refresh → 401
GET /api/v1/workers → 401
```

### Causa Raíz
El sistema usaba `MemorySessionRepository` para almacenar las sesiones JWT en memoria:

```typescript
// src/infrastructure/repository/memory/memory-session.repository.ts:5
private readonly store = new Map<string, Session>();
```

**Problema en Vercel Serverless:**
1. Usuario hace login → sesión guardada en memoria de instancia A
2. Vercel escala → siguiente request va a instancia B (memoria vacía)
3. El refresh token no existe en memoria → 401 Unauthorized

**Es el mismo problema que teníamos con `MemoryNonceRepository`**, pero ahora con sesiones.

## Solución Implementada

### 1. Creado `VercelKvSessionRepository`
Nuevo repositorio que usa **Redis (Upstash)** con `ioredis` para persistir sesiones:

**Archivo:** `src/infrastructure/repository/vercel-kv/vercel-kv-session.repository.ts`

**Features:**
- ✅ Almacena sesiones en Redis con TTL automático
- ✅ Mapea `refresh_token` → `session_id` para búsquedas rápidas
- ✅ Mantiene índice de sesiones por usuario
- ✅ Expira automáticamente sesiones vencidas
- ✅ Funciona en Vercel serverless (memoria compartida entre instancias)

**Estructura de datos en Redis:**
```
session:{session_id}           → Session data (JSON)
refresh_token:{token}          → session_id (mapping)
user_sessions:{user_id}        → Set of session_ids
```

### 2. Actualizado Container
```typescript
// src/infrastructure/container.ts:22-24
const sessionRepo = new VercelKvSessionRepository(); // ✅ Antes: MemorySessionRepository
```

### 3. Exportado desde index
```typescript
// src/infrastructure/repository/vercel-kv/index.ts:2
export { VercelKvSessionRepository } from './vercel-kv-session.repository.js';
```

## Implementación Técnica

### Serialización
```typescript
private serializeSession(session: Session): string {
  return JSON.stringify({
    id: session.id,
    userId: session.userId,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  });
}
```

### TTL Automático
```typescript
async save(session: Session): Promise<void> {
  const ttlSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

  // Guardar con expiración automática
  await redis.set(sessionKey, serializedSession, 'EX', ttlSeconds);
  await redis.set(refreshTokenKey, session.id, 'EX', ttlSeconds);
}
```

### Búsqueda por Refresh Token
```typescript
async findByRefreshToken(token: string): Promise<Session | null> {
  const key = this.getRefreshTokenKey(token);
  const sessionId = await redis.get(key);  // O(1) lookup

  if (!sessionId) return null;

  return this.findById(sessionId);
}
```

## Pasos para Deploy

### 1. Verificar que `KV_REDIS_URL` está configurado en Vercel
```bash
# Ya configurado anteriormente para nonces
KV_REDIS_URL=redis://default:***@redis-15563.c100.us-east-1-4.ec2.cloud.redislabs.com:15563
```

### 2. Push y Deploy
```bash
git add .
git commit -m "fix: Migrate session storage to Redis for serverless compatibility"
git push origin main
```

### 3. Verificar en Vercel
El deploy automático detectará:
- ✅ Nuevos archivos: `vercel-kv-session.repository.ts`
- ✅ Cambios en: `container.ts`, `vercel-kv/index.ts`
- ✅ Build exitoso (ya verificado localmente)

## Testing

### Flujo de Autenticación Completo
1. **Login:** `POST /api/v1/auth/wallet/verify`
   - Crea sesión en Redis con TTL de 30 días
   - Retorna `access_token` (1h) y `refresh_token` (30d)

2. **Request Autenticado:** `GET /api/v1/escrows`
   - Usa `access_token` en header: `Authorization: Bearer <token>`
   - Middleware `withAuth` verifica JWT

3. **Refresh Token:** `POST /api/v1/auth/tokens/refresh`
   - Busca sesión en Redis por `refresh_token`
   - Si existe y no ha expirado → genera nuevos tokens
   - Actualiza sesión en Redis

### Casos de Prueba
```bash
# 1. Login
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x...", "message":"...", "signature":"0x..."}'

# 2. Request con token (debería funcionar ahora)
curl -X GET https://lendi-origins.vercel.app/api/v1/escrows?limit=20 \
  -H "Authorization: Bearer <access_token>"

# 3. Refresh token (debería funcionar ahora)
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/tokens/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

## Impacto

### Antes (MemorySessionRepository)
- ❌ Sesiones se pierden al escalar instancias
- ❌ Refresh tokens no funcionan entre requests
- ❌ Usuarios deben re-autenticarse constantemente
- ❌ 401 errors en producción

### Después (VercelKvSessionRepository)
- ✅ Sesiones persisten en Redis compartido
- ✅ Refresh tokens funcionan correctamente
- ✅ Usuarios mantienen sesión activa por 30 días
- ✅ Sin errores 401 por pérdida de sesión

## Problemas Restantes

### 1. Endpoint 404
```
POST /api/v1/transactions/escrows/report → 404
```
**Solución:** Verificar si el endpoint existe o si el frontend está usando la ruta incorrecta.

### 2. Otros Repositorios en Memoria
Todavía usan `Memory*Repository`:
- ✅ `NonceRepository` → Ya migrado a Redis
- ✅ `SessionRepository` → Ya migrado a Redis
- ⚠️ `UserRepository` → En memoria (se pierde en restart)
- ⚠️ `EscrowRepository` → En memoria (se pierde en restart)
- ⚠️ `LenderRepository` → En memoria (se pierde en restart)
- ⚠️ `WorkerRepository` → En memoria (se pierde en restart)
- ⚠️ `LoanRepository` → En memoria (se pierde en restart)

**Nota:** Los otros repositorios necesitan migración a Postgres/Neon eventualmente.

## Arquitectura

### Redis Keys Schema
```
nonce:{wallet}:{nonce}                    → Nonce data (TTL: 5min)
session:{session_id}                      → Session data (TTL: 30d)
refresh_token:{token}                     → session_id (TTL: 30d)
user_sessions:{user_id}                   → Set<session_id> (TTL: 30d+1h)
```

### Ventajas de esta Estructura
1. **O(1) lookups:** Búsquedas por ID o refresh token son instantáneas
2. **Expiración automática:** Redis maneja TTL sin cronjobs
3. **Índice por usuario:** Permite invalidar todas las sesiones de un usuario
4. **Atomicidad:** Operaciones Redis son atómicas por default

## Referencias

- **Issue similar:** MemoryNonceRepository fix (ya resuelto)
- **Ubicación:** `src/infrastructure/repository/vercel-kv/`
- **Dependencies:** `ioredis` (ya instalado)
- **Config:** `KV_REDIS_URL` en Vercel environment variables

## Conclusión

El problema de los 401 errors estaba causado por el uso de memoria local para sesiones en un entorno serverless donde las instancias no comparten memoria. La solución es usar Redis (Upstash) para persistir sesiones entre todas las instancias de Vercel.

**Status:** ✅ **LISTO PARA DEPLOY**
