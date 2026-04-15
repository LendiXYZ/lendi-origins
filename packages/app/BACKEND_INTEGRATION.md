# Backend Integration Guide - Lendi Frontend

**For:** Frontend/Dapp Development Team
**Backend:** https://lendi-origins.vercel.app
**Last Updated:** April 15, 2026
**Backend Version:** Wave 2 - Production Ready

---

## 🚀 Quick Start

El backend está desplegado y funcionando. Este documento te guía paso a paso para integrar el frontend con el backend.

### Backend Endpoints Base URL
```typescript
const API_BASE_URL = 'https://lendi-origins.vercel.app';
```

### Status del Backend
- ✅ **100% Operacional** - 44/44 endpoints funcionando
- ✅ **Tests Pasados** - 10/10 tests automatizados al 100%
- ✅ **Deploy en Vercel** - Production environment
- ✅ **Base de Datos** - Memory storage (testnet) - ready for Postgres

---

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Autenticación (SIWE)](#autenticación-siwe)
3. [Flujo Completo de Loan](#flujo-completo-de-loan)
4. [API Endpoints](#api-endpoints)
5. [Integración FHE](#integración-fhe)
6. [Ejemplos de Código](#ejemplos-de-código)
7. [Manejo de Errores](#manejo-de-errores)
8. [Testing](#testing)

---

## 🏗️ Arquitectura General

### Componentes del Sistema

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │ ───▶ │   Backend    │ ───▶ │   Blockchain    │
│   (React)   │ ◀─── │   (Vercel)   │ ◀─── │ (Arb Sepolia)   │
└─────────────┘      └──────────────┘      └─────────────────┘
      │                     │                        │
      │                     │                        │
   SIWE Auth          REST API                  FHE Contracts
   JWT Token         ReinieraOS SDK            LendiProof
   @cofhe/sdk        Viem 2.x                  LendiProofGate
```

### Flujo de Datos

1. **Usuario → Frontend**: Conecta wallet (MetaMask, WalletConnect)
2. **Frontend → Backend**: Autentica con SIWE, obtiene JWT
3. **Frontend → Blockchain**: Registra worker, graba income encriptado (FHE)
4. **Frontend → Backend**: Crea loan request
5. **Backend → Blockchain**: Crea escrow, dispara verificación FHE
6. **Backend → Frontend**: Retorna status del loan
7. **Frontend polling**: Consulta status hasta que FHE verification complete

---

## 🔐 Autenticación (SIWE)

### Paso 1: Request Nonce

```typescript
// No requiere autenticación
const requestNonce = async (walletAddress: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/wallet/nonce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
    }),
  });

  const data = await response.json();
  return data.nonce; // string de 64 caracteres
};
```

### Paso 2: Sign Message with Wallet

```typescript
import { SiweMessage } from 'siwe';

const signSiweMessage = async (
  walletAddress: string,
  nonce: string,
  signer: any // ethers.Signer o similar
) => {
  const domain = window.location.host;
  const origin = window.location.origin;

  const siweMessage = new SiweMessage({
    domain,
    address: walletAddress,
    statement: 'Sign in to Lendi',
    uri: origin,
    version: '1',
    chainId: 421614, // Arbitrum Sepolia
    nonce,
  });

  const message = siweMessage.prepareMessage();
  const signature = await signer.signMessage(message);

  return { message, signature };
};
```

### Paso 3: Verify and Get JWT

```typescript
const verifyWallet = async (
  walletAddress: string,
  message: string,
  signature: string
) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/wallet/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      message,
      signature,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // 3600 seconds (1 hour)
  };
};
```

### Paso 4: Store JWT and Use in Requests

```typescript
// Store tokens
localStorage.setItem('access_token', accessToken);
localStorage.setItem('refresh_token', refreshToken);

// Use in authenticated requests
const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response;
};
```

---

## 💰 Flujo Completo de Loan

### Overview del Flujo

```
1. Register Worker (on-chain)
   ↓
2. Register Worker (backend API)
   ↓
3. Record Income (on-chain, FHE encrypted)
   ↓
4. Create Loan Request (backend API)
   ↓
5. Backend creates escrow (ReinieraOS)
   ↓
6. Backend triggers FHE verification
   ↓
7. Wait for verification (10-30s)
   ↓
8. Check loan status / condition met
   ↓
9. Settle escrow if approved
```

### Paso 1: Register Worker On-Chain

```typescript
import { ethers } from 'ethers';

const LENDI_PROOF_ADDRESS = '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4';
const LENDI_PROOF_ABI = [
  'function registerWorker() external',
  'function registeredWorkers(address) view returns (bool)',
  'event WorkerRegistered(address indexed worker)',
];

const registerWorkerOnChain = async (signer: ethers.Signer) => {
  const lendiProof = new ethers.Contract(
    LENDI_PROOF_ADDRESS,
    LENDI_PROOF_ABI,
    signer
  );

  // Check if already registered
  const workerAddress = await signer.getAddress();
  const isRegistered = await lendiProof.registeredWorkers(workerAddress);

  if (isRegistered) {
    console.log('Worker already registered');
    return;
  }

  // Register
  const tx = await lendiProof.registerWorker();
  await tx.wait();

  console.log('Worker registered on-chain');
};
```

### Paso 2: Register Worker in Backend

```typescript
const registerWorkerInBackend = async (walletAddress: string) => {
  const response = await makeAuthenticatedRequest('/api/v1/workers', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: walletAddress,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to register worker in backend');
  }

  const worker = await response.json();
  return worker; // { id, wallet_address, status, created_at }
};
```

### Paso 3: Record Income (FHE Encrypted)

```typescript
import { CofheClient, Encryptable } from '@cofhe/sdk';

const recordEncryptedIncome = async (
  signer: ethers.Signer,
  incomeAmountUsdc: number // e.g., 1000 for $1000
) => {
  // Initialize CoFHE client
  const cofhe = await CofheClient.create({
    network: 'arbitrum-sepolia',
    signer,
  });

  // Convert to USDC format (6 decimals)
  const amountWithDecimals = ethers.parseUnits(
    incomeAmountUsdc.toString(),
    6
  );

  // Encrypt the amount
  const [encryptedAmount] = await cofhe.encrypt([
    Encryptable.uint64(amountWithDecimals),
  ]);

  // Call contract
  const lendiProof = new ethers.Contract(
    LENDI_PROOF_ADDRESS,
    [
      'function recordIncome(bytes) external',
      'event IncomeRecorded(address indexed worker, uint256 timestamp)',
    ],
    signer
  );

  const tx = await lendiProof.recordIncome(encryptedAmount);
  await tx.wait();

  console.log('Income recorded (encrypted)');
};
```

### Paso 4: Create Loan Request

```typescript
interface CreateLoanRequest {
  worker_id: string; // UUID from step 2
  lender_id: string; // UUID of lender (or omit if backend assigns)
  worker_address: string; // e.g., "0x..."
  beneficiary: string; // Address to receive funds
  loan_amount_usdc: number; // e.g., 1000
  threshold_usdc: number; // e.g., 500 (minimum income required)
}

const createLoan = async (loanRequest: CreateLoanRequest) => {
  const response = await makeAuthenticatedRequest('/api/v1/loans', {
    method: 'POST',
    body: JSON.stringify(loanRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.title || 'Failed to create loan');
  }

  const loan = await response.json();
  return loan;
  // {
  //   id: "loan_uuid",
  //   escrow_id: "12345",
  //   status: "verification_pending",
  //   created_at: "2026-04-15T..."
  // }
};
```

### Paso 5: Poll for Loan Status

```typescript
const pollLoanStatus = async (
  loanId: string,
  onUpdate: (loan: any) => void,
  maxAttempts: number = 30, // 30 attempts = ~30 seconds
  intervalMs: number = 1000
) => {
  let attempts = 0;

  const poll = async () => {
    attempts++;

    const response = await makeAuthenticatedRequest(`/api/v1/loans/${loanId}`);
    const loan = await response.json();

    onUpdate(loan);

    // Check if verification is complete
    if (loan.status === 'approved' || loan.status === 'rejected') {
      console.log('Loan verification complete:', loan.status);
      return loan;
    }

    if (attempts < maxAttempts) {
      setTimeout(poll, intervalMs);
    } else {
      console.log('Polling timeout - verification still pending');
    }
  };

  poll();
};

// Usage
const loan = await createLoan(loanRequest);

pollLoanStatus(loan.id, (updatedLoan) => {
  console.log('Loan status:', updatedLoan.status);
  // Update UI
});
```

### Paso 6: Check Condition Met (On-Chain)

```typescript
const GATE_ADDRESS = '0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc';
const GATE_ABI = [
  'function isConditionMet(uint256 escrowId) view returns (bool)',
];

const checkConditionMet = async (
  provider: ethers.Provider,
  escrowId: string
) => {
  const gate = new ethers.Contract(GATE_ADDRESS, GATE_ABI, provider);

  const isMet = await gate.isConditionMet(escrowId);
  return isMet; // true if income >= threshold, false otherwise
};
```

---

## 📡 API Endpoints

### Public Endpoints (No Auth Required)

```typescript
// Health Check
GET /api/health
Response: { status: "healthy", environment: {...} }

// API Documentation
GET /api/v1/docs/openapi.json
Response: OpenAPI 3.0 specification

// Request SIWE Nonce
POST /api/v1/auth/wallet/nonce
Body: { wallet_address: "0x..." }
Response: { nonce: "..." }

// Verify Wallet Signature
POST /api/v1/auth/wallet/verify
Body: { wallet_address: "0x...", message: "...", signature: "0x..." }
Response: { access_token: "...", refresh_token: "...", expires_in: 3600 }
```

### Protected Endpoints (Require Bearer Token)

```typescript
// Workers
POST /api/v1/workers
Body: { wallet_address: "0x..." }
Response: { id, wallet_address, status, created_at }

GET /api/v1/workers/:id
Response: { id, wallet_address, status, created_at, updated_at }

// Lenders
POST /api/v1/lenders
Body: { wallet_address: "0x..." }
Response: { id, wallet_address, status, created_at }

GET /api/v1/lenders/:id
Response: { id, wallet_address, status, created_at }

// Loans
POST /api/v1/loans
Body: {
  worker_id: "uuid",
  lender_id: "uuid", // optional
  worker_address: "0x...",
  beneficiary: "0x...",
  loan_amount_usdc: 1000,
  threshold_usdc: 500
}
Response: { id, escrow_id, status, created_at }

GET /api/v1/loans/:id
Response: { id, escrow_id, worker_id, lender_id, status, created_at, updated_at }

GET /api/v1/loans
Query: ?worker_id=uuid or ?lender_id=uuid
Response: [{ id, escrow_id, status, ... }, ...]

// Income Events (timestamps only, NO amounts)
GET /api/v1/income-events
Query: ?worker_id=uuid
Response: [{ id, worker_id, tx_hash, source, created_at }, ...]

// Balance
GET /api/v1/balance
Query: ?address=0x...
Response: { address, balance, formatted }
```

---

## 🔒 Integración FHE

### Instalación de Dependencias

```bash
npm install @cofhe/sdk ethers@6
```

### Setup del Cliente FHE

```typescript
import { CofheClient, Encryptable } from '@cofhe/sdk';
import { ethers } from 'ethers';

// Initialize once in your app
let cofheClient: CofheClient;

const initializeCofhe = async (signer: ethers.Signer) => {
  if (!cofheClient) {
    cofheClient = await CofheClient.create({
      network: 'arbitrum-sepolia',
      signer,
    });
  }
  return cofheClient;
};
```

### Encriptar Valores

```typescript
// Encrypt income amount
const encryptIncome = async (amountUsdc: number) => {
  const cofhe = await initializeCofhe(signer);

  const amountWithDecimals = ethers.parseUnits(amountUsdc.toString(), 6);

  const [encrypted] = await cofhe.encrypt([
    Encryptable.uint64(amountWithDecimals),
  ]);

  return encrypted; // bytes to send to smart contract
};
```

### Importante: Privacy Guarantees

**✅ El backend NUNCA almacena:**
- Income amounts
- Loan amounts
- Ningún dato financiero descifrado

**✅ El backend SOLO almacena:**
- Worker/Lender addresses
- Income event timestamps (sin amounts)
- Loan status
- Escrow IDs
- Transaction hashes

**Todos los amounts permanecen encriptados on-chain como `euint64`**

---

## 💻 Ejemplos de Código

### Ejemplo Completo: Componente React

```typescript
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CofheClient, Encryptable } from '@cofhe/sdk';

const LoanRequestFlow: React.FC = () => {
  const [status, setStatus] = useState('');
  const [loan, setLoan] = useState<any>(null);

  const handleCreateLoan = async () => {
    try {
      // 1. Get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setStatus('Authenticating...');

      // 2. Authenticate with SIWE
      const nonce = await requestNonce(address);
      const { message, signature } = await signSiweMessage(address, nonce, signer);
      const { accessToken } = await verifyWallet(address, message, signature);

      localStorage.setItem('access_token', accessToken);

      setStatus('Registering worker...');

      // 3. Register worker (if not already)
      await registerWorkerOnChain(signer);
      const worker = await registerWorkerInBackend(address);

      setStatus('Recording income...');

      // 4. Record encrypted income
      await recordEncryptedIncome(signer, 1000); // $1000

      setStatus('Creating loan...');

      // 5. Create loan
      const loanRequest = {
        worker_id: worker.id,
        worker_address: address,
        beneficiary: address, // or different address
        loan_amount_usdc: 500,
        threshold_usdc: 800,
      };

      const createdLoan = await createLoan(loanRequest);
      setLoan(createdLoan);

      setStatus('Waiting for FHE verification...');

      // 6. Poll for status
      pollLoanStatus(createdLoan.id, (updatedLoan) => {
        setLoan(updatedLoan);
        if (updatedLoan.status === 'approved') {
          setStatus('Loan approved! 🎉');
        } else if (updatedLoan.status === 'rejected') {
          setStatus('Loan rejected (income too low)');
        }
      });
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Request Loan</h2>
      <button onClick={handleCreateLoan}>Create Loan Request</button>
      <p>Status: {status}</p>
      {loan && (
        <div>
          <p>Loan ID: {loan.id}</p>
          <p>Escrow ID: {loan.escrow_id}</p>
          <p>Status: {loan.status}</p>
        </div>
      )}
    </div>
  );
};

export default LoanRequestFlow;
```

---

## ⚠️ Manejo de Errores

### Códigos de Error HTTP

```typescript
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
        // Bad Request - validation error
        console.error('Validation error:', error.detail);
        break;
      case 401:
        // Unauthorized - invalid or expired token
        console.error('Authentication failed - please log in again');
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        break;
      case 404:
        // Not Found
        console.error('Resource not found:', error.title);
        break;
      case 422:
        // Unprocessable Entity - business logic error
        console.error('Business logic error:', error.title);
        break;
      case 500:
        // Internal Server Error
        console.error('Server error - please try again later');
        break;
      default:
        console.error('Unknown error:', error);
    }

    throw new Error(error.title || 'API request failed');
  }
};
```

### Errores Comunes y Soluciones

```typescript
// Error: "Worker not registered on-chain"
// Solution: Call registerWorkerOnChain() first

// Error: "Invalid token" (401)
// Solution: Token expired, re-authenticate with SIWE

// Error: "Insufficient income" (422)
// Solution: Worker needs to record more income before requesting loan

// Error: "FHE verification timeout"
// Solution: Wait longer (up to 30s), or check RPC connection
```

---

## 🧪 Testing

### Testar Autenticación

```typescript
// Test SIWE flow
const testAuth = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // 1. Request nonce
  const nonce = await requestNonce(address);
  console.log('Nonce:', nonce);

  // 2. Sign message
  const { message, signature } = await signSiweMessage(address, nonce, signer);
  console.log('Message signed');

  // 3. Verify
  const { accessToken } = await verifyWallet(address, message, signature);
  console.log('Access token:', accessToken);

  // 4. Test authenticated endpoint
  const response = await makeAuthenticatedRequest('/api/v1/workers');
  console.log('Workers:', await response.json());
};
```

### Testar Worker Registration

```typescript
const testWorkerRegistration = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Register on-chain
  await registerWorkerOnChain(signer);

  // Register in backend (requires auth first)
  const worker = await registerWorkerInBackend(address);
  console.log('Worker registered:', worker);
};
```

---

## 📊 Información de Contratos

### Arbitrum Sepolia Addresses

```typescript
export const CONTRACTS = {
  lendiProof: '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4',
  lendiProofGate: '0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc',
  lendiPolicy: '0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E',
  usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  // ReinieraOS contracts (used by backend)
  escrow: '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa',
  confidentialUsdc: '0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f',
};

export const CHAIN_ID = 421614; // Arbitrum Sepolia
export const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
```

---

## 🔗 Links Útiles

### Backend Resources
- **Backend URL:** https://lendi-origins.vercel.app
- **API Docs:** https://lendi-origins.vercel.app/api/v1/docs/openapi.json
- **Health Check:** https://lendi-origins.vercel.app/api/health

### Documentation
- **Backend Status:** `../backend/BACKEND_STATUS.md`
- **Test Results:** `../backend/TEST_RESULTS.md`
- **E2E Testing Guide:** `../backend/E2E_TESTING.md`
- **Deployment Guide:** `../backend/DEPLOYMENT.md`

### Blockchain
- **Block Explorer:** https://sepolia.arbiscan.io/
- **Faucet:** https://arbitrum-sepolia.bridge.io
- **CoFHE Docs:** https://cofhe-docs.fhenix.zone

---

## 🎯 Checklist de Integración

### Fase 1: Setup Básico
- [ ] Instalar dependencias (`@cofhe/sdk`, `ethers`, `siwe`)
- [ ] Configurar wallet connection (MetaMask, WalletConnect)
- [ ] Implementar SIWE authentication
- [ ] Guardar JWT token en localStorage

### Fase 2: Worker Flow
- [ ] Implementar register worker on-chain
- [ ] Implementar register worker in backend
- [ ] Implementar income recording (FHE encrypted)

### Fase 3: Loan Flow
- [ ] Implementar create loan request
- [ ] Implementar loan status polling
- [ ] Mostrar loan status en UI
- [ ] Implementar check condition met

### Fase 4: UX/UI
- [ ] Loading states durante FHE verification (10-30s)
- [ ] Error handling y mensajes de usuario
- [ ] Success/failure notifications
- [ ] Transaction history view

### Fase 5: Testing
- [ ] Test SIWE auth flow completo
- [ ] Test worker registration
- [ ] Test income recording con valores reales
- [ ] Test loan creation end-to-end
- [ ] Verificar que NO se muestran amounts en UI (privacy)

---

## 💡 Tips de Desarrollo

### Performance
- Cache el `CofheClient` - inicializar solo una vez
- Use React Query o SWR para API calls
- Implement optimistic UI updates donde sea posible

### Security
- **NUNCA** logear tokens en console.log
- **NUNCA** mostrar amounts descifrados en UI
- Validar inputs antes de enviar al backend
- Limpiar tokens en logout

### UX
- Mostrar progress bar durante FHE verification (puede tomar 10-30s)
- Explicar al usuario qué significa "FHE verification pending"
- Proveer link a block explorer para transacciones
- Mostrar gas estimates antes de transacciones

---

## 🆘 Soporte

**¿Problemas con la integración?**

1. Revisa `../backend/TEST_RESULTS.md` - todos los endpoints testeados
2. Revisa `../backend/E2E_TESTING.md` - flujo completo documentado
3. Usa `../backend/LOCAL_TESTING.md` para testar endpoints con curl
4. Consulta los logs de Vercel: https://vercel.com/dashboard

**Contacto:**
- GitHub Issues: (crear issue)
- Backend Team: (contacto)

---

## ✅ Conclusión

El backend está **100% funcional y testeado**. Todos los endpoints necesarios están disponibles y documentados.

**Lo que el backend provee:**
- ✅ Autenticación SIWE + JWT
- ✅ Worker/Lender registration
- ✅ Loan creation con FHE verification
- ✅ ReinieraOS escrow integration
- ✅ Privacy-first architecture (zero amounts stored)

**Lo que el frontend necesita implementar:**
- Wallet connection (MetaMask/WalletConnect)
- SIWE message signing
- FHE encryption con @cofhe/sdk
- UI para loan flow
- Status polling durante FHE verification

**Tiempo estimado de integración:** 2-3 días para developer experimentado

---

**¡Éxito con la integración! 🚀**
