# Backend Changes - Guía para Frontend

## Resumen Ejecutivo

El backend ha migrado el almacenamiento de autenticación de memoria local a **Redis (Upstash)** para soportar correctamente el entorno serverless de Vercel.

**Lo más importante:** El API contract **NO cambió**. URLs, payloads y responses siguen igual. El frontend puede seguir usando el mismo código.

---

## ✅ Problemas Resueltos

### 1. Errores 401 "Unauthorized" (RESUELTO)
**Antes:**
```
GET /api/v1/escrows → 401 Unauthorized
POST /api/v1/auth/tokens/refresh → 401 Unauthorized
GET /api/v1/workers → 401 Unauthorized
```

**Causa:** Sessions y users se guardaban en memoria local. Cuando Vercel escalaba a otra instancia serverless, la sesión se perdía.

**Ahora:** ✅ Todos estos endpoints funcionan con 200 OK

### 2. Error 500 en Login (RESUELTO)
**Antes:**
```
POST /api/v1/auth/wallet/verify → 500 Internal Server Error
```

**Causa:** El repositorio de usuarios intentaba serializar un campo `updatedAt` que no existe en el modelo User.

**Ahora:** ✅ Login funciona correctamente y retorna tokens

### 3. Refresh Tokens no Funcionaban (RESUELTO)
**Antes:** Se perdían en memoria entre instancias serverless

**Ahora:** ✅ Persisten en Redis por 30 días completos

---

## 🔐 Flujo de Autenticación (SIN CAMBIOS)

El flujo de autenticación **NO ha cambiado** desde la perspectiva del frontend:

### 1. Obtener Nonce
```http
POST /api/v1/auth/wallet/nonce
Content-Type: application/json

{
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "nonce": "f1afaf127432db33b56ed0c0bb6bf7740ca57bb4..."
}
```

### 2. Firmar Mensaje SIWE (Client-side)
```typescript
const message = `lendi.xyz wants you to sign in with your Ethereum account:
0x...

Sign in with Ethereum to Lendi

URI: https://lendi.xyz
Version: 1
Chain ID: 421614
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

const signature = await signer.signMessage(message);
```

### 3. Verificar y Obtener Tokens
```http
POST /api/v1/auth/wallet/verify
Content-Type: application/json

{
  "wallet_address": "0x...",
  "message": "lendi.xyz wants you to sign in...",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 4. Usar Access Token en Requests
```http
GET /api/v1/escrows
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": [...],
  "pagination": {...}
}
```

### 5. Refrescar Token (Cuando Expire)
```http
POST /api/v1/auth/tokens/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## ⏰ Duración de Tokens

| Token | Duración | Uso |
|-------|----------|-----|
| **Access Token** | **1 hora** (3600 segundos) | Requests autenticados |
| **Refresh Token** | **30 días** (2592000 segundos) | Renovar access token |

---

## ⚠️ Importante para Frontend

### El Access Token Expira en 1 Hora

El frontend **DEBE** implementar renovación automática de tokens:

### 1. Guardar Tokens en Storage
```typescript
// Después de login exitoso
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);
```

### 2. Interceptor para Auto-Refresh (Recomendado)
```typescript
// Ejemplo con axios
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Si recibimos 401 y no hemos reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/v1/auth/tokens/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Actualizar header y reintentar
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh token expiró o es inválido
        logout(); // Redirigir a login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 3. Función de Refresh Manual
```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch('/api/v1/auth/tokens/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      // Refresh token expiró o es inválido (después de 30 días)
      logout();
      throw new Error('Session expired');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);

    return data.access_token;
  } catch (error) {
    logout();
    throw error;
  }
}
```

### 4. Logout Cuando Refresh Falla
```typescript
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}
```

---

## 📡 Endpoints Disponibles

### Autenticación (No requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/wallet/nonce` | Obtener nonce para firma SIWE |
| POST | `/api/v1/auth/wallet/verify` | Login con firma (retorna tokens) |
| POST | `/api/v1/auth/tokens/refresh` | Renovar access token |

### Escrows (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/escrows?limit=20&offset=0` | Listar escrows |
| GET | `/api/v1/escrows/{publicId}` | Obtener escrow por ID |
| POST | `/api/v1/escrows` | Crear nuevo escrow |

### Workers (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/workers?limit=20` | Listar workers |
| GET | `/api/v1/workers/{id}` | Obtener worker por ID |
| POST | `/api/v1/workers` | Crear worker |

### Lenders (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/lenders?limit=20` | Listar lenders |
| GET | `/api/v1/lenders/{id}` | Obtener lender por ID |
| POST | `/api/v1/lenders` | Crear lender |

### Loans (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/loans?limit=20` | Listar loans |
| GET | `/api/v1/loans/{id}` | Obtener loan por ID |
| POST | `/api/v1/loans` | Crear loan |

### Income Events (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/income-events?limit=20` | Listar eventos de ingreso |
| GET | `/api/v1/income-events/{id}` | Obtener evento por ID |
| POST | `/api/v1/income-events` | Crear evento de ingreso |

### Transactions (Requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/transactions/escrows/report` | Reportar transacción de escrow on-chain |

**Nota sobre `/transactions/escrows/report`:**
- ✅ El endpoint **SÍ existe** y funciona correctamente
- Requiere: `{"tx_hash": "0x...", "entity_id": "escrow-id"}`
- Retorna 404 si el escrow no existe (es correcto, no es error de ruta)

---

## 🔒 Headers Requeridos

### Para Endpoints Autenticados
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Opcional (según wallet utilizada)
```http
X-Wallet-Provider: zerodev | walletconnect
```

---

## ⚠️ Manejo de Errores

### Formato de Error Estándar
Todos los errores siguen este formato:

```json
{
  "type": "https://httpstatuses.com/401",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid token"
}
```

### Códigos de Error Comunes

| Código | Título | Cuándo Ocurre | Acción Frontend |
|--------|--------|---------------|-----------------|
| 400 | Bad Request | Payload inválido o falta campo requerido | Validar datos antes de enviar |
| 401 | Unauthorized | Token inválido, expirado o faltante | Intentar refresh, si falla → logout |
| 404 | Not Found | Recurso no existe (escrow, worker, etc.) | Mostrar mensaje al usuario |
| 409 | Conflict | Recurso ya existe (ej. wallet ya registrada) | Mostrar error específico |
| 500 | Internal Server Error | Error en servidor | Reintentar o mostrar error |

### Ejemplo de Función Helper
```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`https://lendi-origins.vercel.app${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Auto-refresh en 401
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      // Reintentar con nuevo token
      return fetch(`https://lendi-origins.vercel.app${url}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (error) {
      logout();
      throw error;
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.title);
  }

  return response.json();
}

// Uso
const escrows = await fetchWithAuth('/api/v1/escrows?limit=20');
```

---

## 🧪 Testing

### Endpoints Verificados (Todos Funcionando ✅)
```bash
✅ POST /api/v1/auth/wallet/nonce → 200 OK
✅ POST /api/v1/auth/wallet/verify → 200 OK
✅ GET /api/v1/escrows → 200 OK
✅ GET /api/v1/workers → 200 OK
✅ POST /api/v1/auth/tokens/refresh → 200 OK
✅ POST /api/v1/transactions/escrows/report → 200 OK (o 404 si escrow no existe)
```

### Ejemplo de Prueba con cURL
```bash
# 1. Get nonce
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0xYourAddress"}'

# 2. Login (después de firmar mensaje con wallet)
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address":"0x...",
    "message":"lendi.xyz wants you to...",
    "signature":"0x..."
  }'

# 3. Usar token
curl -X GET https://lendi-origins.vercel.app/api/v1/escrows \
  -H "Authorization: Bearer <access_token>"

# 4. Refresh token
curl -X POST https://lendi-origins.vercel.app/api/v1/auth/tokens/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

---

## 🚀 Cambios Técnicos Internos (Info para Devs)

### Migración a Redis
El backend migró de memoria local a Redis (Upstash) para:
- **Nonces:** TTL de 5 minutos
- **Sessions:** TTL de 30 días
- **Users:** Sin expiración

### Ventajas
1. ✅ Sesiones persisten entre instancias serverless de Vercel
2. ✅ Refresh tokens funcionan correctamente por 30 días completos
3. ✅ No más pérdida de sesión al escalar horizontalmente
4. ✅ Usuarios no necesitan re-autenticarse constantemente

### Repositorios Actualizados
```typescript
// Antes (memoria local - NO funciona en serverless)
new MemoryUserRepository()
new MemorySessionRepository()
new MemoryNonceRepository()

// Ahora (Redis - funciona en serverless)
new VercelKvUserRepository()      // ✅
new VercelKvSessionRepository()   // ✅
new VercelKvNonceRepository()     // ✅
```

### Variables de Entorno (Ya configuradas en Vercel)
```bash
KV_REDIS_URL=redis://...
JWT_SECRET=...
ACCESS_TOKEN_TTL=3600        # 1 hora
REFRESH_TOKEN_TTL=2592000    # 30 días
```

---

## 🔄 Checklist de Migración Frontend

Si el frontend ya tenía implementado el flujo de auth, **NO requiere cambios en el flujo base**. Solo verificar:

- [ ] Tokens se guardan después de login (`access_token` y `refresh_token`)
- [ ] Access token se envía en header `Authorization: Bearer <token>`
- [ ] Implementado interceptor para auto-refresh cuando se recibe 401
- [ ] Logout limpia tokens del storage cuando refresh falla
- [ ] Manejo de errores muestra mensajes apropiados al usuario

### Nueva Implementación
Si es la primera vez implementando auth:

1. [ ] Implementar flujo SIWE (Sign-In With Ethereum)
2. [ ] Guardar tokens en localStorage/sessionStorage
3. [ ] Crear interceptor HTTP para agregar token automáticamente
4. [ ] Implementar auto-refresh en respuesta 401
5. [ ] Implementar logout cuando refresh falla

---

## 📊 URL de Producción

```
https://lendi-origins.vercel.app
```

**Base URL para todos los endpoints:**
```
https://lendi-origins.vercel.app/api/v1/...
```

---

## 📝 Changelog

### v0.1.0 (2026-04-19)

**Fixed:**
- ✅ Migrado nonce storage a Redis (VercelKvNonceRepository)
- ✅ Migrado session storage a Redis (VercelKvSessionRepository)
- ✅ Migrado user storage a Redis (VercelKvUserRepository)
- ✅ Corregido errores 401 en endpoints autenticados
- ✅ Corregido error 500 en endpoint de login
- ✅ Refresh token ahora funciona correctamente por 30 días

**Unchanged (No cambios en API contract):**
- URLs de endpoints (mismas rutas)
- Formato de requests y responses (mismos payloads)
- Flujo de autenticación SIWE (mismo proceso)
- Formato de tokens JWT (misma estructura)

---

## 🎯 TL;DR - Resumen Ultra-Corto

**Para el frontend:**
1. ✅ Todos los endpoints ahora funcionan correctamente
2. ✅ **NO hay cambios** en URLs, payloads o responses
3. ✅ Refresh tokens funcionan por 30 días (antes fallaban)
4. ⚠️ **Access token expira en 1 hora** - implementar auto-refresh
5. ✅ El backend está listo para producción

**Acción requerida:**
- Implementar interceptor para renovar token automáticamente al recibir 401
- Testear que después de 1 hora de inactividad, la app hace auto-refresh correctamente

---

## 📞 Soporte

Si encuentran algún error o comportamiento inesperado:

1. Verificar que el token no haya expirado (1 hora)
2. Verificar headers correctos (`Authorization`, `Content-Type`)
3. Revisar formato del payload según la documentación
4. Revisar logs de Vercel si persiste el error

**Deployment actual:** Commit `3d7b5f0` en `main`
