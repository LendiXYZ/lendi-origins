# Backend Implementation Status — Lendi Wave 2

## ✅ Actualizado

### Configuración
- ✅ `.env.example` actualizado con direcciones de contratos deployados
- ✅ `src/core/config.ts` actualizado con variables Lendi y ReinieraOS

### Contratos Deployados (Arbitrum Sepolia)
```
LendiProof:         0x809B8FC3C0e12f8F1b280E8A823294F98760fad4
LendiProofGate:     0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc
LendiPolicy:        0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E
USDC:               0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

## ✅ Ya Existe en el Backend

### Arquitectura
- ✅ Clean Architecture (Domain → Application → Infrastructure → Interface)
- ✅ TypeScript + strict mode
- ✅ Drizzle ORM configurado
- ✅ Viem para blockchain
- ✅ SIWE + JWT auth (`jose`)
- ✅ Pino logger

### Dominio (Domain Layer)
- ✅ `Worker` model + repository + status enum
- ✅ `Loan` model + repository + status enum
- ✅ `IncomeEvent` model + repository
- ✅ `Lender` model + repository
- ✅ `Escrow` model + repository + events
- ✅ `Session` + `User` models para auth
- ✅ FHE types (`EncryptedValue`, `EncryptedEscrowData`)

### Casos de Uso (Application Layer)
- ✅ **Auth**: `request-nonce`, `verify-wallet`, `refresh-token`, `logout`
- ✅ **Worker**: `create-worker`, `get-worker-by-id`, `get-workers`
- ✅ **Lender**: `create-lender`, `get-lender-by-id`, `get-lenders`
- ✅ **Loan**: `create-loan`, `get-loan-by-id`, `get-loans`
- ✅ **IncomeEvent**: `create-income-event`, `get-income-event-by-id`, `get-income-events`
- ✅ **Escrow**: `create-escrow`, `get-escrow-by-id`, `get-escrows`, `get-public-escrow`
- ✅ **Webhook**: `process-escrow-event`, `relay-callback`
- ✅ **Balance**: `get-balance`
- ✅ **Withdrawal**: bridge + withdrawal flows
- ✅ **Credential**: API credential management (OAuth)

### Infraestructura (Infrastructure Layer)
- ✅ Auth services: `jwt.service`, `nonce.service`, `siwe-verifier`
- ✅ FHE services: `fhe.service`, `fhe-worker.client`
- ✅ Repository implementations (memory + postgres ready)
- ✅ Container DI pattern

### Interface (API Layer)
- ✅ Handler factory pattern
- ✅ Middleware: `with-auth`, `with-cors`
- ✅ Response helpers

## 🔧 Pendiente de Implementar (Wave 2 Specific)

### 1. Blockchain Clients

#### `src/infrastructure/blockchain/LendiProofClient.ts`
Necesita:
```typescript
- isRegistered(address): Promise<boolean>
- linkEscrow(escrowId: bigint, worker: string, thresholdUSDC: number)
```

#### `src/infrastructure/blockchain/LendiProofGateClient.ts`
Necesita:
```typescript
- requestVerification(escrowId: bigint)
- publishVerification(escrowId: bigint, result: boolean, signature)
- isConditionMet(escrowId: bigint): Promise<boolean>
- getEncryptedHandle(escrowId: bigint): Promise<ebool>
```

#### `src/infrastructure/blockchain/FHEService.ts`
Necesita:
```typescript
- decryptAndPublish(escrowId: bigint)
  → Get handle → decrypt off-chain → publish result
```

#### `src/infrastructure/blockchain/ReinieraSDKClient.ts`
Necesita:
```typescript
- createLoanEscrow(params): Promise<bigint>
  → Usa @reineira-os/sdk para crear escrow con gate condition
```

### 2. Use Cases a Modificar

#### `src/application/use-case/loan/create-loan.use-case.ts`
Actualizar para:
1. Verificar worker registrado (`LendiProofClient.isRegistered`)
2. Crear escrow en ReinieraOS (`ReinieraSDKClient.createLoanEscrow`)
3. Automático: gate llama `linkEscrow` vía `onConditionSet`
4. Request FHE verification (`LendiProofGateClient.requestVerification`)
5. Trigger decrypt + publish (`FHEService.decryptAndPublish`)
6. Guardar loan con `status: 'pending_verification'`

#### `src/application/use-case/worker/register-worker.use-case.ts`
Verificar que llama a contrato o solo guarda DB

### 3. API Routes (si no existen)

#### Necesitamos confirmar si existen:
- `POST /api/auth/siwe/challenge`
- `POST /api/auth/siwe/verify`
- `POST /api/worker/register`
- `GET /api/worker/:address/status`
- `GET /api/income/history`
- `POST /api/loan/create`
- `GET /api/loan/:id/status`
- `POST /api/verify/income`

### 4. Webhook Handler

#### `src/application/use-case/webhook/quicknode-handler.use-case.ts`
Necesita escuchar eventos de `LendiProof`:
- `IncomeRecorded(address worker, uint256 timestamp)` → log timestamp only
- `ProofRequested(address lender, address worker, uint64 threshold)`
- `EscrowLinked(uint256 escrowId, address worker, uint64 threshold)`

### 5. Database Schema

Verificar si necesita ajustes:
- ✅ `workers` table — OK (tiene `walletAddress`, `status`, `createdAt`)
- ✅ `incomeEvents` table — OK (tiene `workerId`, `txHash`, `source`, `createdAt`)
- ✅ `loans` table — ⚠️ Verificar campo `escrowId` es `string` (uint256 as string)

### 6. Dependencias Faltantes

Verificar si están instaladas:
```bash
@reineira-os/sdk      # Para crear escrows
@cofhe/sdk            # Para FHE off-chain decryption
```

## 📝 Siguiente Paso Recomendado

1. **Instalar dependencias faltantes**
   ```bash
   cd packages/backend
   pnpm add @reineira-os/sdk @cofhe/sdk
   ```

2. **Crear blockchain clients** (4 archivos)
   - `LendiProofClient.ts`
   - `LendiProofGateClient.ts`
   - `FHEService.ts`
   - `ReinieraSDKClient.ts`

3. **Actualizar `create-loan.use-case.ts`** con flujo completo de Wave 2

4. **Verificar/crear routes** en `src/interface/`

5. **Implementar QuickNode webhook handler**

6. **Testing local** con dev server

7. **Deploy a Vercel**

8. **Post-deploy: Registrar backend signer** como lender en LendiProof

## 🎯 Privacidad — Non-Negotiable

```
✅ CAN store:   worker addresses, income timestamps, tx hashes, escrow IDs, loan status
❌ NEVER store: income amounts, loan amounts, decrypted financial data
```

Todos los montos permanecen como `euint64` en blockchain o decrypted in RAM only.
