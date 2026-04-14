# Vercel Deployment Guide - Lendi Backend

## Prerequisites

1. Cuenta de Vercel (https://vercel.com)
2. Vercel CLI instalado (ya disponible via npx)

## Paso 1: Login a Vercel

```bash
npx vercel login
```

Este comando abrirá tu navegador para autenticarte. Sigue las instrucciones.

## Paso 2: Deploy Initial

Desde el directorio `packages/backend`, ejecuta:

```bash
npx vercel --prod
```

El CLI te hará algunas preguntas:
- Set up and deploy? **Yes**
- Which scope? (selecciona tu cuenta personal o team)
- Link to existing project? **No** (primera vez)
- What's your project's name? **lendi-backend** (o el nombre que prefieras)
- In which directory is your code located? **./** (Enter para usar el directorio actual)

El deployment se iniciará. Espera a que complete.

## Paso 3: Configurar Variables de Entorno

Una vez completado el deployment inicial, necesitas configurar las variables de entorno en Vercel Dashboard.

Ve a: https://vercel.com/tu-username/lendi-backend/settings/environment-variables

### Variables REQUERIDAS (Production):

```
JWT_SECRET=<generar-secreto-seguro-minimo-32-caracteres>
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### Variables de Contratos (Wave 2 - Ya deployados en Arbitrum Sepolia):

```
LENDI_PROOF_ADDRESS=0x809B8FC3C0e12f8F1b280E8A823294F98760fad4
LENDI_PROOF_GATE_ADDRESS=0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc
LENDI_POLICY_ADDRESS=0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
ESCROW_CONTRACT_ADDRESS=0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
COVERAGE_MANAGER_ADDRESS=0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6
POOL_FACTORY_ADDRESS=0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
POLICY_REGISTRY_ADDRESS=0xf421363B642315BD3555dE2d9BD566b7f9213c8E
CONFIDENTIAL_USDC_ADDRESS=0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f
```

### Variables de Configuración (Opcionales con defaults):

```
JWT_ISSUER=lendi-api
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
CHAIN_ID=421614
LOG_LEVEL=info
DB_PROVIDER=memory
```

### Variables de CORS para Production:

```
ALLOWED_ORIGINS=https://tu-frontend-domain.vercel.app,https://lendi.com
```

**IMPORTANTE:** Reemplaza con los dominios reales de tu frontend en producción.

### Variables Opcionales (si las necesitas):

```
PUSDC_WRAPPER_ADDRESS=<si-tienes-wrapper-de-usdc>
QUICKNODE_WEBHOOK_SECRET=<generar-si-usas-quicknode>
RELAY_WEBHOOK_SECRET=<generar-si-usas-relay>
REINEIRA_API_KEY=<si-usas-reineira-api>
SIGNER_PRIVATE_KEY=<solo-si-backend-firma-txs>
DATABASE_URL=<si-usas-postgres-en-lugar-de-memory>
```

## Paso 4: Re-deploy con Variables de Entorno

Después de configurar las variables en Vercel Dashboard:

```bash
npx vercel --prod
```

Esto hará un nuevo deployment con todas las variables de entorno configuradas.

## Paso 5: Verificar Deployment

Una vez completado, Vercel te dará una URL de producción:

```
https://lendi-backend-xxx.vercel.app
```

### Probar endpoints públicos:

```bash
# Health check
curl https://tu-deployment-url.vercel.app/api/health

# Get nonce (endpoint público)
curl -X POST https://tu-deployment-url.vercel.app/api/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}'
```

## Paso 6: Comandos Útiles

```bash
# Ver deployments
npx vercel list

# Ver logs en tiempo real
npx vercel logs <deployment-url>

# Rollback a deployment anterior
npx vercel rollback <deployment-url>

# Ver información del proyecto
npx vercel inspect <deployment-url>
```

## Troubleshooting

### Error: "Module not found"
- Verificar que todas las dependencies estén en `package.json`
- Verificar que `vercel.json` tenga el comando de install correcto

### Error: "Environment variable not defined"
- Ir a Vercel Dashboard → Settings → Environment Variables
- Verificar que todas las variables requeridas estén configuradas
- Re-deploy después de agregar variables

### Error: "Build failed"
- Ver logs completos en Vercel Dashboard
- Verificar que `pnpm run build` funcione localmente
- Verificar configuración de `vercel.json`

## Notas Importantes

1. **JWT_SECRET**: Debe ser único y seguro en producción. Genera uno con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **ALLOWED_ORIGINS**: En producción, solo incluir dominios autorizados, nunca "*"

3. **DB_PROVIDER**: Por defecto usa "memory". Para producción considerar migrar a Postgres con Vercel Postgres o Neon.

4. **SIGNER_PRIVATE_KEY**: Solo necesario si el backend firma transacciones (actualmente no requerido).

## Post-Deployment

Después del deployment exitoso:

1. Configurar dominios custom (opcional)
2. Configurar QuickNode webhooks apuntando a tu deployment
3. Registrar el backend como lender usando el script correspondiente
4. Probar flujo completo end-to-end

## URLs de Referencia

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- Vercel CLI Docs: https://vercel.com/docs/cli
