# Guía de Registro de Lenders - Lendi Backend

**Versión:** 1.0
**Última actualización:** 2026-04-19
**Network:** Arbitrum Sepolia Testnet

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Registro Off-Chain (Backend API)](#registro-off-chain-backend-api)
4. [Registro On-Chain (Smart Contracts)](#registro-on-chain-smart-contracts)
5. [Estados del Lender](#estados-del-lender)
6. [Flujo Completo de Registro](#flujo-completo-de-registro)
7. [Implementación Frontend](#implementación-frontend)
8. [Verificación y Sincronización](#verificación-y-sincronización)
9. [Consideraciones Importantes](#consideraciones-importantes)

---

## Resumen Ejecutivo

El registro de lenders en Lendi es un proceso híbrido (off-chain + on-chain) que requiere:

| Aspecto | Detalle |
|---------|---------|
| **Moneda de pago** | USDC (no ETH) |
| **Fee de registro** | 1 USDC (1,000,000 unidades con 6 decimales) |
| **USDC Contract** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| **LendiProof Contract** | `0x...` (ver variables de entorno) |
| **Autenticación Backend** | JWT token vía SIWE |
| **Permiso de registro** | Cualquiera puede registrarse pagando el fee |
| **Registro gratuito** | Solo owner puede registrar sin fee |

---

## Arquitectura del Sistema

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌────────────────┐              ┌──────────────────┐
│  Backend API   │              │  Smart Contract  │
│   (Off-Chain)  │              │   (On-Chain)     │
│                │              │                  │
│  • JWT Auth    │              │  • USDC Payment  │
│  • Status      │              │  • Registration  │
│  • Metadata    │              │  • Verification  │
└────────────────┘              └──────────────────┘
       │                                 │
       │                                 │
       ▼                                 ▼
┌────────────────┐              ┌──────────────────┐
│MemoryRepository│              │  Arbitrum Chain  │
│  (Temporal)    │              │   (Permanent)    │
└────────────────┘              └──────────────────┘
```

---

## Registro Off-Chain (Backend API)

### Endpoint: `POST /api/v1/lenders`

Crea un registro de lender en el backend para tracking y gestión.

#### Autenticación
**Requerida:** JWT token obtenido vía SIWE authentication

```http
POST /api/v1/lenders
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

**Validación:**
- `wallet_address`: Requerido, debe ser dirección Ethereum válida (checksummed)

#### Response Exitosa (201 Created)
```json
{
  "id": "661d8392-e44b-4fe2-9aab-86a4d87dc86b",
  "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "status": "PENDING",
  "fee_paid": false,
  "on_chain_registered": false,
  "created_at": "2026-04-19T02:57:14.605Z",
  "updated_at": "2026-04-19T02:57:14.605Z"
}
```

#### Errores
- **401 Unauthorized**: Token JWT inválido o ausente
- **422 Unprocessable Entity**: `wallet_address` inválido o ausente

#### Implementación Interna

**Use Case:** `CreateLenderUseCase` (`src/application/use-case/lender/create-lender.use-case.ts:11-25`)

```typescript
async execute(dto: CreateLenderDto): Promise<LenderResponse> {
  const now = new Date();
  const lender = new Lender({
    id: randomUUID(),                    // UUID generado
    walletAddress: dto.wallet_address,
    status: LenderStatus.PENDING,        // Estado inicial
    feePaid: false,
    onChainRegistered: false,
    createdAt: now,
    updatedAt: now,
  });

  await this.lenderRepository.save(lender);
  return toLenderResponse(lender);
}
```

---

## Registro On-Chain (Smart Contracts)

### Contratos Involucrados

#### 1. LendiProof (Core Contract)
Contrato principal que mantiene el registro de lenders.

**Funciones relevantes:**
```solidity
// Estado público
mapping(address => bool) public registeredLenders;

// Constante de fee
uint256 public constant LENDER_REGISTRATION_FEE = 1e6; // 1 USDC

// Función de registro (pública, requiere fee)
function registerLender() external;

// Función de registro por owner (gratis)
function registerLenderByOwner(address lender) external onlyOwner;
```

**Address:** Ver variable de entorno `LENDI_PROOF_ADDRESS`

#### 2. USDC Token Contract
Token ERC-20 estándar de Circle en Arbitrum Sepolia.

**Address:** `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
**Decimals:** 6

---

## Estados del Lender

El modelo `Lender` en el backend maneja 4 estados:

```typescript
enum LenderStatus {
  PENDING = 'PENDING',          // Creado en backend, esperando registro on-chain
  REGISTERED = 'REGISTERED',    // Registrado on-chain, fee pagado
  ACTIVE = 'ACTIVE',            // Activo para originar préstamos
  SUSPENDED = 'SUSPENDED'       // Suspendido temporalmente
}
```

### Transiciones de Estado

```
PENDING → REGISTERED → ACTIVE
   ↓                      ↓
   └──────────────→ SUSPENDED
```

### Métodos de Transición

**Código:** `src/domain/lender/model/lender.ts:32-50`

```typescript
// PENDING → REGISTERED
markAsRegistered(): this {
  this.status = LenderStatus.REGISTERED;
  this.onChainRegistered = true;
  this.feePaid = true;
  this.updatedAt = new Date();
  return this;
}

// REGISTERED → ACTIVE
markAsActive(): this {
  this.status = LenderStatus.ACTIVE;
  this.updatedAt = new Date();
  return this;
}

// ACTIVE/REGISTERED → SUSPENDED
markAsSuspended(): this {
  this.status = LenderStatus.SUSPENDED;
  this.updatedAt = new Date();
  return this;
}
```

---

## Flujo Completo de Registro

### Opción A: Auto-Registro (Usuario Paga 1 USDC)

**Caso de uso:** Cualquier usuario puede convertirse en lender pagando el fee.

#### Paso 1: Autenticación SIWE
```typescript
// 1.1. Solicitar nonce
const nonceRes = await fetch(`${API_URL}/api/v1/auth/wallet/nonce`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet_address: address })
});
const { nonce } = await nonceRes.json();

// 1.2. Firmar mensaje SIWE
const message = `lendi.xyz wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to Lendi

URI: https://lendi.xyz
Version: 1
Chain ID: 421614
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

const signature = await signMessageAsync({ message });

// 1.3. Verificar firma y obtener JWT
const verifyRes = await fetch(`${API_URL}/api/v1/auth/wallet/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet_address: address, message, signature })
});
const { access_token } = await verifyRes.json();
```

#### Paso 2: Registro Off-Chain (Backend)
```typescript
const lenderRes = await fetch(`${API_URL}/api/v1/lenders`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ wallet_address: address })
});
const lender = await lenderRes.json();
// lender.status === "PENDING"
```

#### Paso 3: Aprobar USDC al Contrato
```typescript
import { parseUnits } from 'viem';

const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const LENDI_PROOF_ADDRESS = process.env.LENDI_PROOF_ADDRESS;

const approveHash = await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: 'approve',
  args: [
    LENDI_PROOF_ADDRESS,
    parseUnits('1', 6) // 1 USDC (6 decimals)
  ]
});

await publicClient.waitForTransactionReceipt({ hash: approveHash });
```

#### Paso 4: Registrarse On-Chain
```typescript
const registerHash = await walletClient.writeContract({
  address: LENDI_PROOF_ADDRESS,
  abi: lendiProofAbi,
  functionName: 'registerLender'
});

const receipt = await publicClient.waitForTransactionReceipt({
  hash: registerHash
});

// Verificar evento LenderRegistered
const event = receipt.logs.find(log =>
  log.topics[0] === keccak256('LenderRegistered(address,uint256)')
);
```

#### Paso 5: Verificar Registro On-Chain (Backend)
```typescript
// Backend verifica el registro en el contrato
const isRegistered = await lendiProofClient.isLenderRegistered(address);

if (isRegistered) {
  lender.markAsRegistered();
  await lenderRepository.save(lender);
}
```

---

### Opción B: Registro por Owner (Gratis)

**Caso de uso:** Owner registra lenders sin fee para partnerships o setup inicial.

```solidity
// Contrato: LendiProof.sol:126-130
function registerLenderByOwner(address lender) external onlyOwner {
    require(!registeredLenders[lender], "Already registered");
    registeredLenders[lender] = true;
    emit LenderRegistered(lender, 0); // Fee = 0
}
```

**Desde el frontend (solo owner):**
```typescript
const registerHash = await walletClient.writeContract({
  address: LENDI_PROOF_ADDRESS,
  abi: lendiProofAbi,
  functionName: 'registerLenderByOwner',
  args: [lenderAddress]
});

await publicClient.waitForTransactionReceipt({ hash: registerHash });
```

---

## Implementación Frontend

### Ejemplo Completo: Hook de React

```typescript
import { useState } from 'react';
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const LENDI_PROOF_ADDRESS = process.env.NEXT_PUBLIC_LENDI_PROOF_ADDRESS;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useLenderRegistration() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState<string>('');

  const registerAsLender = async () => {
    if (!address) throw new Error('Wallet not connected');

    setIsRegistering(true);
    setStatus('Authenticating...');

    try {
      // 1. Autenticación SIWE
      const nonceRes = await fetch(`${API_URL}/api/v1/auth/wallet/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      });
      const { nonce } = await nonceRes.json();

      const timestamp = new Date().toISOString();
      const message = `lendi.xyz wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to Lendi

URI: https://lendi.xyz
Version: 1
Chain ID: 421614
Nonce: ${nonce}
Issued At: ${timestamp}`;

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch(`${API_URL}/api/v1/auth/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, message, signature })
      });
      const { access_token } = await verifyRes.json();

      // 2. Registro off-chain
      setStatus('Creating backend record...');
      await fetch(`${API_URL}/api/v1/lenders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet_address: address })
      });

      // 3. Aprobar USDC
      setStatus('Approving USDC...');
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [LENDI_PROOF_ADDRESS, parseUnits('1', 6)]
      });

      // 4. Registrarse on-chain
      setStatus('Registering on-chain...');
      const registerHash = await writeContractAsync({
        address: LENDI_PROOF_ADDRESS,
        abi: lendiProofAbi,
        functionName: 'registerLender'
      });

      setStatus('Registration complete!');
      return { success: true, txHash: registerHash };

    } catch (error) {
      console.error('Registration failed:', error);
      setStatus('Registration failed');
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  return { registerAsLender, isRegistering, status };
}
```

---

## Verificación y Sincronización

### Verificar Registro On-Chain desde Backend

**Client:** `LendiProofClient` (`src/infrastructure/blockchain/lendi-proof.client.ts:121-136`)

```typescript
async isLenderRegistered(address: Address): Promise<boolean> {
  try {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LENDI_PROOF_ABI,
      functionName: 'registeredLenders',
      args: [address],
    });

    this.logger.debug({ address, result }, 'Checked lender registration');
    return result;
  } catch (error) {
    this.logger.error({ error, address }, 'Failed to check lender registration');
    throw error;
  }
}
```

### Sincronización Manual

Si el registro on-chain se completó pero el backend no se actualizó:

```typescript
// Endpoint propuesto (por implementar)
POST /api/v1/lenders/{id}/sync
Headers: Authorization: Bearer <jwt_token>

// El backend verificará on-chain y actualizará el estado
```

---

## Consideraciones Importantes

### 1. Persistencia Temporal en Backend

⚠️ **CRÍTICO:** Los lenders se guardan en `MemoryLenderRepository`

**Implicaciones:**
- Los registros off-chain se pierden al reiniciar el servidor
- Solo el estado on-chain (blockchain) es permanente
- Para producción: migrar a base de datos persistente (PostgreSQL, MongoDB, etc.)

**Ubicación:** `src/infrastructure/repository/memory/memory-lender.repository.ts`

### 2. Obtener USDC de Testnet

Para registrarse en Arbitrum Sepolia, necesitas USDC testnet:

**Opciones:**
1. **Faucet de Circle:** https://faucet.circle.com/ (requiere cuenta)
2. **Bridge desde Sepolia:** Usar bridge de Arbitrum para mover USDC de Ethereum Sepolia
3. **Uniswap Testnet:** Swap ETH Sepolia por USDC en Arbitrum Sepolia

### 3. Gas Fees

Además del fee de 1 USDC, el usuario paga gas en ETH Sepolia:
- `approve()`: ~50,000 gas
- `registerLender()`: ~80,000 gas
- **Total:** ~130,000 gas (~0.0013 ETH en testnet)

### 4. Verificación de Balance Antes de Registrar

```typescript
// Verificar balance de USDC antes de intentar registro
const balance = await publicClient.readContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [address]
});

const hasEnoughUSDC = balance >= parseUnits('1', 6);

if (!hasEnoughUSDC) {
  throw new Error('Insufficient USDC balance. Need 1 USDC to register.');
}
```

### 5. Eventos del Contrato

Escuchar eventos para tracking:

```solidity
event LenderRegistered(address indexed lender, uint256 feePaid);
```

```typescript
// Watchear eventos
const unwatch = publicClient.watchContractEvent({
  address: LENDI_PROOF_ADDRESS,
  abi: lendiProofAbi,
  eventName: 'LenderRegistered',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log(`Lender registered: ${log.args.lender}, Fee: ${log.args.feePaid}`);
      // Actualizar UI o sincronizar con backend
    });
  }
});
```

### 6. Manejo de Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Already registered` | Usuario ya registrado on-chain | Verificar estado antes de intentar registro |
| `Fee transfer failed` | Falta approve o balance insuficiente | Verificar allowance y balance USDC |
| `401 Unauthorized` | JWT expirado o inválido | Re-autenticar con SIWE |
| `Insufficient fee` | Fee incorrecta (si usas LendiProofGate) | Verificar constante `LENDER_REGISTRATION_FEE` |

---

## Otros Endpoints de Backend

### Listar Lenders

```http
GET /api/v1/lenders
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "661d8392-e44b-4fe2-9aab-86a4d87dc86b",
    "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "status": "REGISTERED",
    "fee_paid": true,
    "on_chain_registered": true,
    "created_at": "2026-04-19T02:57:14.605Z",
    "updated_at": "2026-04-19T02:58:30.123Z"
  }
]
```

### Obtener Lender por ID

```http
GET /api/v1/lenders/{id}
Authorization: Bearer <jwt_token>
```

**Response:** (mismo formato que arriba)

---

## Variables de Entorno

### Backend
```bash
# Blockchain
LENDI_PROOF_ADDRESS=0x...
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# JWT
JWT_SECRET=<your-secret>

# Redis (para nonces)
KV_REDIS_URL=redis://...
```

### Frontend
```bash
NEXT_PUBLIC_LENDI_PROOF_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
NEXT_PUBLIC_API_URL=https://lendi-origins.vercel.app
```

---

## Referencias

### Código Fuente

| Componente | Ubicación |
|------------|-----------|
| Lender Model | `src/domain/lender/model/lender.ts` |
| Lender Status Enum | `src/domain/lender/model/lender-status.enum.ts` |
| Create Lender Use Case | `src/application/use-case/lender/create-lender.use-case.ts` |
| Lender API Endpoint | `api/v1/lenders/index.ts` |
| Blockchain Client | `src/infrastructure/blockchain/lendi-proof.client.ts` |
| LendiProof Contract | `packages/contracts/contracts/LendiProof.sol` |

### Contratos (Arbitrum Sepolia)

| Contrato | Address |
|----------|---------|
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| LendiProof | Ver `LENDI_PROOF_ADDRESS` |
| LendiProofGate | `0x68AE6d292553C0fBa8e797c0056Efe56038227A1` |

---

## Checklist de Implementación Frontend

- [ ] Implementar autenticación SIWE
- [ ] Crear hook `useLenderRegistration()`
- [ ] Verificar balance USDC antes de registrar
- [ ] Mostrar estado de transacciones (approve, register)
- [ ] Manejar errores comunes (balance, approve, etc.)
- [ ] Escuchar evento `LenderRegistered`
- [ ] Sincronizar estado on-chain con backend
- [ ] Agregar loading states y feedback visual
- [ ] Implementar retry logic para fallos de red
- [ ] Agregar analytics/tracking de conversión

---

**Nota:** Este documento se actualiza con cada cambio en la arquitectura de registro de lenders. Última revisión: 2026-04-19.
