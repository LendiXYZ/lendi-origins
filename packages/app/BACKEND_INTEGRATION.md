# Backend Integration Guide - Lendi Frontend

**For:** Frontend/Dapp Development Team
**Backend:** https://lendi-origins.vercel.app
**Last Updated:** April 18, 2026
**Backend Version:** Wave 2 - Production Ready
**Contracts Version:** Wave 2 (IncomeSource + Getters)

---

## 🎉 Wave 2 Updates

### What's New in Wave 2

1. **IncomeSource Enum** - Track income verification method (MANUAL, PRIVARA, BANK_LINK, PAYROLL)
2. **Updated recordIncome** - Now requires `source` parameter
3. **3 New Getter Functions** - Enable frontend to read encrypted worker income for BalanceView
4. **Updated IncomeRecorded Event** - Emits `source` field

**Critical for Phase 4**: The new getters (`getMyMonthlyIncome`, `getSealedMonthlyIncome`, `getMyTxCount`) unlock the BalanceView component!

---

## 🚀 Quick Start

El backend está desplegado y funcionando. Este documento te guía paso a paso para integrar el frontend con el backend.

### Backend Endpoints Base URL
```typescript
const API_BASE_URL = 'https://lendi-origins.vercel.app';
```

### Status del Backend
- ✅ **100% Operacional** - 44/44 endpoints funcionando
- ✅ **Tests Pasados** - 262/262 tests automatizados al 100%
- ✅ **Deploy en Vercel** - Production environment
- ✅ **Wave 2 Contracts** - Deployed & Verified on Arbitrum Sepolia

---

## 📋 Tabla de Contenidos

1. [Contract Addresses (Wave 2)](#contract-addresses-wave-2)
2. [Updated ABIs](#updated-abis)
3. [Arquitectura General](#arquitectura-general)
4. [Autenticación (SIWE)](#autenticación-siwe)
5. [Worker Flow (Phase 4)](#worker-flow-phase-4)
6. [Complete Loan Flow (Wave 2)](#-complete-loan-flow-wave-2)
7. [Loan Flow - Detailed Implementation](#-loan-flow---detailed-implementation)
8. [API Endpoints](#api-endpoints)
9. [Integración FHE](#integración-fhe)
10. [New Features: BalanceView](#new-features-balanceview)
11. [Manejo de Errores](#manejo-de-errores)
12. [Complete E2E Example](#-complete-e2e-example-wave-2)

---

## 📍 Contract Addresses (Wave 2)

### Updated Addresses - April 18, 2026

```typescript
export const CONTRACTS = {
  // OLD (Wave 1) - DEPRECATED
  // lendiProof: '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4',
  // lendiProofGate: '0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc',
  // lendiPolicy: '0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E',

  // NEW (Wave 2) - USE THESE
  lendiProof: '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac',
  lendiProofGate: '0x06b0523e63FF904d622aa6d125FdEe11201Bf791',
  lendiPolicy: '0x68AE6d292553C0fBa8e797c0056Efe56038227A1',

  // Unchanged
  usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',

  // ReinieraOS contracts (used by backend)
  escrow: '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa',
  confidentialUsdc: '0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f',
};

export const CHAIN_ID = 421614; // Arbitrum Sepolia
export const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
```

### Environment Variables

Update your `.env`:

```bash
# Wave 2 Contract Addresses (April 18, 2026)
VITE_LENDI_PROOF_ADDRESS=0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac
VITE_LENDI_PROOF_GATE_ADDRESS=0x06b0523e63FF904d622aa6d125FdEe11201Bf791
VITE_LENDI_POLICY_ADDRESS=0x68AE6d292553C0fBa8e797c0056Efe56038227A1
VITE_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# Blockchain
VITE_CHAIN_ID=421614
VITE_COFHE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Backend API
VITE_API_BASE_URL=https://lendi-origins.vercel.app
```

### Verified Contracts on Arbiscan

- **LendiProof**: https://sepolia.arbiscan.io/address/0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac#code
- **LendiProofGate**: https://sepolia.arbiscan.io/address/0x06b0523e63FF904d622aa6d125FdEe11201Bf791#code
- **LendiPolicy**: https://sepolia.arbiscan.io/address/0x68AE6d292553C0fBa8e797c0056Efe56038227A1#code

All contracts verified with source code + new getter functions visible in Read Contract tab.

---

## 🔧 Updated ABIs

### LendiProof ABI (Wave 2)

Create/update `src/contracts/LendiProofABI.ts`:

```typescript
export const LendiProofABI = [
  // ========================================
  // REGISTRATION
  // ========================================
  {
    type: 'function',
    name: 'registerWorker',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'registerLenderByOwner',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'lender', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'registeredWorkers',
    stateMutability: 'view',
    inputs: [{ name: 'worker', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'registeredLenders',
    stateMutability: 'view',
    inputs: [{ name: 'lender', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },

  // ========================================
  // INCOME RECORDING (UPDATED - Wave 2)
  // ========================================
  {
    type: 'function',
    name: 'recordIncome',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'encAmount', type: 'bytes' }, // InEuint64 (FHE encrypted)
      { name: 'source', type: 'uint8' },    // NEW: IncomeSource enum as uint8
    ],
    outputs: [],
  },

  // ========================================
  // NEW GETTERS (Wave 2) ⭐ CRITICAL
  // ========================================
  {
    type: 'function',
    name: 'getMyMonthlyIncome',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }], // euint64 handle (for decryption)
  },
  {
    type: 'function',
    name: 'getSealedMonthlyIncome',
    stateMutability: 'view',
    inputs: [{ name: 'worker', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }], // euint64 handle (sealed for lender)
  },
  {
    type: 'function',
    name: 'getMyTxCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }], // euint64 handle
  },

  // ========================================
  // ESCROW
  // ========================================
  {
    type: 'function',
    name: 'linkEscrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'worker', type: 'address' },
      { name: 'thresholdIncome', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'escrowToWorker',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'escrowToThreshold',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'uint64' }],
  },

  // ========================================
  // EVENTS (UPDATED - Wave 2)
  // ========================================
  {
    type: 'event',
    name: 'WorkerRegistered',
    inputs: [{ name: 'worker', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'LenderRegistered',
    inputs: [{ name: 'lender', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'IncomeRecorded',
    inputs: [
      { name: 'worker', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'source', type: 'uint8', indexed: true }, // NEW: IncomeSource enum
    ],
  },
  {
    type: 'event',
    name: 'EscrowLinked',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'worker', type: 'address', indexed: true },
      { name: 'threshold', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProofRequested',
    inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }],
  },
] as const;
```

### IncomeSource Enum

```typescript
// src/types/income.ts
export enum IncomeSource {
  MANUAL = 0,      // Manually recorded by worker
  PRIVARA = 1,     // Verified via Privara protocol (Phase 6)
  BANK_LINK = 2,   // Bank integration (future)
  PAYROLL = 3,     // Payroll provider (future)
}

export function getSourceName(source: IncomeSource): string {
  const names = {
    [IncomeSource.MANUAL]: 'Manual',
    [IncomeSource.PRIVARA]: 'Privara',
    [IncomeSource.BANK_LINK]: 'Bank Link',
    [IncomeSource.PAYROLL]: 'Payroll',
  };
  return names[source] || 'Unknown';
}

export function getSourceIcon(source: IncomeSource): string {
  const icons = {
    [IncomeSource.MANUAL]: '✏️',
    [IncomeSource.PRIVARA]: '🔐',
    [IncomeSource.BANK_LINK]: '🏦',
    [IncomeSource.PAYROLL]: '💼',
  };
  return icons[source] || '❓';
}
```

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
   JWT Token         ReinieraOS SDK            LendiProof (Wave 2)
   @cofhe/sdk        Viem 2.x                  + New Getters
```

### Flujo de Datos (Wave 2)

1. **Usuario → Frontend**: Conecta wallet (MetaMask, WalletConnect)
2. **Frontend → Backend**: Autentica con SIWE, obtiene JWT
3. **Frontend → Blockchain**: Registra worker, graba income encriptado (FHE) **con source**
4. **Frontend → Blockchain**: Lee income encriptado con `getMyMonthlyIncome()` **NEW**
5. **Frontend**: Descifra income para mostrar en BalanceView **NEW**
6. **Frontend → Backend**: Crea loan request
7. **Backend → Blockchain**: Crea escrow, dispara verificación FHE
8. **Backend → Frontend**: Retorna status del loan
9. **Frontend polling**: Consulta status hasta que FHE verification complete

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

## 👷 Worker Flow (Phase 4)

### Overview - Phase 4 Worker Dashboard

```
1. Register Worker (on-chain + backend)
   ↓
2. Record Income (on-chain, FHE encrypted, with source)  ← UPDATED
   ↓
3. View Balance (decrypt with getMyMonthlyIncome)        ← NEW
   ↓
4. View Income History (timestamps + sources)            ← NEW
   ↓
5. Request Loan
```

### Step 1: Register Worker On-Chain

```typescript
import { ethers } from 'ethers';
import { LendiProofABI } from './contracts/LendiProofABI';

const LENDI_PROOF_ADDRESS = '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac';

const registerWorkerOnChain = async (signer: ethers.Signer) => {
  const lendiProof = new ethers.Contract(
    LENDI_PROOF_ADDRESS,
    LendiProofABI,
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

### Step 2: Register Worker in Backend

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

### Step 3: Record Income (Wave 2 - WITH SOURCE)

```typescript
import { CofheClient, Encryptable } from '@cofhe/sdk';
import { IncomeSource } from './types/income';

const recordEncryptedIncome = async (
  signer: ethers.Signer,
  incomeAmountUsdc: number, // e.g., 1000 for $1000
  source: IncomeSource = IncomeSource.MANUAL
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

  // Call contract WITH SOURCE (Wave 2)
  const lendiProof = new ethers.Contract(
    LENDI_PROOF_ADDRESS,
    LendiProofABI,
    signer
  );

  const tx = await lendiProof.recordIncome(encryptedAmount, source);
  await tx.wait();

  console.log(`Income recorded (encrypted) with source: ${getSourceName(source)}`);
};

// Usage examples:
await recordEncryptedIncome(signer, 1500, IncomeSource.MANUAL);
await recordEncryptedIncome(signer, 2000, IncomeSource.PRIVARA); // Phase 6
```

---

## ⭐ New Features: BalanceView

### Wave 2 enables the BalanceView component!

### Hook: useWorkerIncome

```typescript
import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CofheClient } from '@cofhe/sdk';
import { LendiProofABI } from '../contracts/LendiProofABI';

export function useWorkerIncome() {
  const { address } = useAccount();
  const [decryptedIncome, setDecryptedIncome] = useState<bigint | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // 1. Get encrypted income handle from contract
  const { data: encryptedHandle, isLoading } = useContractRead({
    address: import.meta.env.VITE_LENDI_PROOF_ADDRESS as `0x${string}`,
    abi: LendiProofABI,
    functionName: 'getMyMonthlyIncome',
    account: address, // Must be registered worker
  });

  // 2. Decrypt the handle with CoFHE
  useEffect(() => {
    if (!encryptedHandle || !address) return;

    const decrypt = async () => {
      setIsDecrypting(true);
      try {
        const cofhe = await CofheClient.create({
          network: 'arbitrum-sepolia',
          signer: /* get signer */,
        });

        const decrypted = await cofhe.unseal(
          import.meta.env.VITE_LENDI_PROOF_ADDRESS,
          encryptedHandle,
        );

        setDecryptedIncome(decrypted);
      } catch (error) {
        console.error('Failed to decrypt income:', error);
      } finally {
        setIsDecrypting(false);
      }
    };

    decrypt();
  }, [encryptedHandle, address]);

  return {
    encryptedHandle,
    decryptedIncome, // In cents (e.g., 150000 = $1500.00)
    isLoading: isLoading || isDecrypting,
  };
}
```

### Component: BalanceView

```tsx
import { useWorkerIncome } from '../hooks/useWorkerIncome';

export function BalanceView() {
  const { decryptedIncome, isLoading } = useWorkerIncome();

  if (isLoading) {
    return (
      <div className="balance-card loading">
        <div className="spinner" />
        <p>Descifrando ingreso...</p>
      </div>
    );
  }

  if (!decryptedIncome) {
    return (
      <div className="balance-card empty">
        <p>No has registrado tu ingreso aún</p>
        <button>Registrar Ingreso</button>
      </div>
    );
  }

  // Format as currency
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(decryptedIncome) / 1_000_000); // USDC has 6 decimals

  return (
    <div className="balance-card">
      <h3>Tu Ingreso Mensual</h3>
      <p className="amount">{formatted}</p>
      <p className="privacy-badge">🔒 Encriptado con FHE</p>
      <p className="last-updated">Última actualización: Hoy</p>
    </div>
  );
}
```

### Component: IncomeHistory

```tsx
import { IncomeSource, getSourceName, getSourceIcon } from '../types/income';

interface IncomeEvent {
  id: string;
  tx_hash: string;
  source: IncomeSource;
  created_at: string;
}

export function IncomeHistory() {
  const [events, setEvents] = useState<IncomeEvent[]>([]);

  useEffect(() => {
    // Fetch from backend API
    const fetchEvents = async () => {
      const response = await makeAuthenticatedRequest(
        `/api/v1/income-events?worker_id=${workerId}`
      );
      const data = await response.json();
      setEvents(data);
    };

    fetchEvents();
  }, []);

  return (
    <div className="income-history">
      <h3>Historial de Ingresos</h3>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <span className="source-icon">{getSourceIcon(event.source)}</span>
            <span className="source-name">{getSourceName(event.source)}</span>
            <span className="date">
              {new Date(event.created_at).toLocaleDateString('es-MX')}
            </span>
            <a
              href={`https://sepolia.arbiscan.io/tx/${event.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver en Arbiscan ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 💰 Complete Loan Flow (Wave 2)

### Overview del Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKER LOAN FLOW (Wave 2)                 │
└─────────────────────────────────────────────────────────────┘

1. Register Worker (on-chain)
   └─> Call: lendiProof.registerWorker()
   └─> Gas: ~50k, FREE
   ↓
2. Register Worker (backend API)
   └─> POST /api/v1/workers
   └─> Returns: { id: "uuid", wallet_address, status }
   ↓
3. Record Income (on-chain, FHE encrypted) ⭐ UPDATED
   └─> Call: lendiProof.recordIncome(encAmount, source)
   └─> NEW: source parameter (0=MANUAL, 1=PRIVARA, 2=BANK_LINK, 3=PAYROLL)
   └─> Gas: ~120k
   └─> Emits: IncomeRecorded(worker, timestamp, source)
   ↓
3.5 View Balance (NEW - Optional) ⭐
   └─> Call: lendiProof.getMyMonthlyIncome()
   └─> Returns: euint64 handle
   └─> Decrypt: cofhe.unseal(handle)
   └─> Display: Formatted USDC amount
   ↓
4. Create Loan Request (backend API)
   └─> POST /api/v1/loans
   └─> Body: { worker_id, worker_address, beneficiary, loan_amount_usdc, threshold_usdc }
   └─> Returns: { id, escrow_id, status: "verification_pending" }
   ↓
5. Backend Creates Escrow (ReinieraOS) [Automatic]
   └─> Backend calls: reineiraSDK.createEscrow()
   └─> With condition: LendiProofGate resolver
   └─> Escrow ID linked to loan
   ↓
6. Backend Triggers FHE Verification [Automatic]
   └─> Backend calls: lendiProofGate.requestVerification(escrowId)
   └─> Emits: VerificationRequested
   ↓
7. Wait for Verification (10-30s) [Automatic]
   └─> Backend webhook listens for VerificationPublished
   └─> Updates loan status automatically
   └─> Possible outcomes:
       • approved (income >= threshold)
       • rejected (income < threshold)
   ↓
8. Check Loan Status (frontend polling)
   └─> GET /api/v1/loans/:id
   └─> Poll every 1s for max 30s
   └─> Returns: { status: "approved" | "rejected" | "verification_pending" }
   ↓
9. Settle Escrow (if approved)
   └─> Frontend or backend calls: reineiraSDK.settleEscrow(escrowId)
   └─> Funds released to beneficiary
```

### Wave 2 Changes Summary

**Breaking Changes:**
1. **`recordIncome()` signature changed** - Now requires `source: uint8` parameter
2. **Contract addresses changed** - All Wave 1 addresses deprecated
3. **Event structure updated** - `IncomeRecorded` now emits `source` field

**New Features (Non-Breaking):**
1. **3 Getter Functions** - Enable reading encrypted worker data
2. **Optional BalanceView** - Workers can view income before requesting loan
3. **IncomeSource Tracking** - Track verification method in events

**Unchanged:**
- Worker registration (on-chain + backend)
- Loan request API
- Backend escrow creation flow
- FHE verification mechanism
- Polling logic
- Escrow settlement

---

## 💰 Loan Flow - Detailed Implementation

### Step 1: Create Loan Request

```typescript
interface CreateLoanRequest {
  worker_id: string; // UUID from backend
  lender_id?: string; // UUID of lender (optional if backend assigns)
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
  //   created_at: "2026-04-18T..."
  // }
};
```

### Step 2: Poll for Loan Status

```typescript
const pollLoanStatus = async (
  loanId: string,
  onUpdate: (loan: any) => void,
  maxAttempts: number = 30,
  intervalMs: number = 1000
) => {
  let attempts = 0;

  const poll = async () => {
    attempts++;

    const response = await makeAuthenticatedRequest(`/api/v1/loans/${loanId}`);
    const loan = await response.json();

    onUpdate(loan);

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

// Loans
POST /api/v1/loans
Body: {
  worker_id: "uuid",
  worker_address: "0x...",
  beneficiary: "0x...",
  loan_amount_usdc: 1000,
  threshold_usdc: 500
}
Response: { id, escrow_id, status, created_at }

GET /api/v1/loans/:id
Response: { id, escrow_id, worker_id, lender_id, status, created_at }

// Income Events (NEW - Wave 2)
GET /api/v1/income-events
Query: ?worker_id=uuid
Response: [{ id, worker_id, tx_hash, source, created_at }, ...]
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
const encryptIncome = async (amountUsdc: number) => {
  const cofhe = await initializeCofhe(signer);
  const amountWithDecimals = ethers.parseUnits(amountUsdc.toString(), 6);

  const [encrypted] = await cofhe.encrypt([
    Encryptable.uint64(amountWithDecimals),
  ]);

  return encrypted;
};
```

### Desencriptar Valores (Wave 2)

```typescript
const decryptIncome = async (encryptedHandle: bigint) => {
  const cofhe = await initializeCofhe(signer);

  const decrypted = await cofhe.unseal(
    LENDI_PROOF_ADDRESS,
    encryptedHandle,
  );

  return decrypted; // bigint in USDC decimals (6)
};
```

---

## ⚠️ Manejo de Errores

### Breaking Changes in Wave 2

1. **recordIncome signature changed**:
   ```typescript
   // OLD (Wave 1) - WILL FAIL
   await lendiProof.recordIncome(encryptedAmount);

   // NEW (Wave 2) - MUST INCLUDE SOURCE
   await lendiProof.recordIncome(encryptedAmount, IncomeSource.MANUAL);
   ```

2. **IncomeRecorded event structure**:
   ```typescript
   // OLD:
   event.args // { worker, timestamp }

   // NEW:
   event.args // { worker, timestamp, source }
   ```

3. **Contract addresses changed**:
   - All 3 Lendi contracts have new addresses
   - Update `.env` and redeploy

### Common Errors

```typescript
// Error: "Worker not registered on-chain"
// Solution: Call registerWorkerOnChain() first

// Error: "Invalid token" (401)
// Solution: Token expired, re-authenticate with SIWE

// Error: "Insufficient income" (422)
// Solution: Worker needs to record more income before requesting loan

// Error: "FHE verification timeout"
// Solution: Wait longer (up to 30s), or check RPC connection

// Error: "Wrong number of arguments" (calling recordIncome)
// Solution: Update to Wave 2 ABI, include source parameter
```

---

## ✅ Testing Checklist

### Wave 2 Updates
- [ ] Update contract addresses in `.env`
- [ ] Update `LendiProofABI` with new functions and source parameter
- [ ] Add `IncomeSource` enum types
- [ ] Update all `recordIncome` calls to include source
- [ ] Implement `BalanceView` component with `getMyMonthlyIncome`
- [ ] Update event listeners to handle `source` field
- [ ] Test full flow: register → record income → view balance → create loan

### Phase 4 Worker Flow
- [ ] Test worker registration (on-chain + backend)
- [ ] Test income recording with different sources (MANUAL, PRIVARA, etc.)
- [ ] Test balance view decryption
- [ ] Test income history display with sources
- [ ] Test loan creation after income recorded
- [ ] Verify privacy: NO amounts shown in UI, only encrypted/decrypted

---

## 🚀 Complete E2E Example (Wave 2)

### Full Worker Flow Implementation

```typescript
// src/flows/WorkerLoanFlow.tsx
import { useState } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import { CofheClient, Encryptable } from '@cofhe/sdk';
import { LendiProofABI } from '../contracts/LendiProofABI';
import { IncomeSource } from '../types/income';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LENDI_PROOF_ADDRESS = import.meta.env.VITE_LENDI_PROOF_ADDRESS;

export function WorkerLoanFlow() {
  const { address } = useAccount();
  const { data: signer } = useSigner();
  const [status, setStatus] = useState<string>('');
  const [loanId, setLoanId] = useState<string | null>(null);

  // Step 1 & 2: Register Worker
  const registerWorker = async () => {
    if (!signer || !address) return;

    try {
      setStatus('Registering on-chain...');

      // 1. On-chain registration
      const lendiProof = new ethers.Contract(
        LENDI_PROOF_ADDRESS,
        LendiProofABI,
        signer
      );

      const isRegistered = await lendiProof.registeredWorkers(address);

      if (!isRegistered) {
        const tx = await lendiProof.registerWorker();
        await tx.wait();
        setStatus('Registered on-chain ✓');
      } else {
        setStatus('Already registered on-chain ✓');
      }

      // 2. Backend registration
      setStatus('Registering in backend...');
      const response = await fetch(`${API_BASE_URL}/api/v1/workers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: address,
        }),
      });

      if (response.ok) {
        const worker = await response.json();
        localStorage.setItem('worker_id', worker.id);
        setStatus('Worker registered ✓');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Step 3: Record Income (Wave 2 - with source)
  const recordIncome = async (amountUsdc: number, source: IncomeSource) => {
    if (!signer || !address) return;

    try {
      setStatus(`Recording income ($${amountUsdc})...`);

      // Initialize CoFHE client
      const cofhe = await CofheClient.create({
        network: 'arbitrum-sepolia',
        signer,
      });

      // Encrypt amount (USDC has 6 decimals)
      const amountWithDecimals = ethers.parseUnits(amountUsdc.toString(), 6);
      const [encrypted] = await cofhe.encrypt([
        Encryptable.uint64(amountWithDecimals),
      ]);

      setStatus('Submitting to blockchain...');

      // Call contract WITH SOURCE (Wave 2)
      const lendiProof = new ethers.Contract(
        LENDI_PROOF_ADDRESS,
        LendiProofABI,
        signer
      );

      const tx = await lendiProof.recordIncome(
        {
          ctHash: encrypted.data,
          securityZone: encrypted.securityZone,
          utype: encrypted.utype,
          signature: encrypted.inputProof,
        },
        source // Wave 2: MANUAL=0, PRIVARA=1, etc.
      );

      await tx.wait();
      setStatus(`Income recorded ✓ (Source: ${IncomeSource[source]})`);
    } catch (error) {
      console.error('Record income error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Step 3.5: View Balance (NEW in Wave 2)
  const viewBalance = async () => {
    if (!signer || !address) return;

    try {
      setStatus('Reading encrypted income...');

      const lendiProof = new ethers.Contract(
        LENDI_PROOF_ADDRESS,
        LendiProofABI,
        signer
      );

      // Get encrypted handle
      const encryptedHandle = await lendiProof.getMyMonthlyIncome();

      setStatus('Decrypting...');

      // Decrypt with CoFHE
      const cofhe = await CofheClient.create({
        network: 'arbitrum-sepolia',
        signer,
      });

      const decrypted = await cofhe.unseal(
        LENDI_PROOF_ADDRESS,
        encryptedHandle
      );

      // Format as USD
      const amountUsd = Number(decrypted) / 1_000_000;
      setStatus(`Your monthly income: $${amountUsd.toFixed(2)} ✓`);

      return amountUsd;
    } catch (error) {
      console.error('View balance error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Step 4-9: Create Loan and Poll Status
  const createLoan = async (loanAmountUsdc: number, thresholdUsdc: number) => {
    if (!address) return;

    try {
      const workerId = localStorage.getItem('worker_id');
      if (!workerId) {
        setStatus('Error: Worker not registered in backend');
        return;
      }

      setStatus(`Creating loan ($${loanAmountUsdc})...`);

      // Step 4: Create loan request
      const response = await fetch(`${API_BASE_URL}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worker_id: workerId,
          worker_address: address,
          beneficiary: address,
          loan_amount_usdc: loanAmountUsdc,
          threshold_usdc: thresholdUsdc,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.title || 'Failed to create loan');
      }

      const loan = await response.json();
      setLoanId(loan.id);
      setStatus(`Loan created ✓ (ID: ${loan.id.slice(0, 8)}...)`);

      // Steps 5-7 happen automatically in backend
      setStatus('Backend creating escrow...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStatus('FHE verification in progress...');

      // Step 8: Poll for status
      await pollLoanStatus(loan.id);
    } catch (error) {
      console.error('Create loan error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Step 8: Poll Loan Status
  const pollLoanStatus = async (loanId: string, maxAttempts = 30) => {
    let attempts = 0;

    const poll = async () => {
      attempts++;
      setStatus(`Checking verification status (${attempts}/${maxAttempts})...`);

      const response = await fetch(`${API_BASE_URL}/api/v1/loans/${loanId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const loan = await response.json();

      if (loan.status === 'approved') {
        setStatus('✅ LOAN APPROVED! Income sufficient.');
        // Step 9: Could auto-settle here or let user trigger
        return loan;
      } else if (loan.status === 'rejected') {
        setStatus('❌ Loan rejected: Insufficient income');
        return loan;
      } else if (attempts < maxAttempts) {
        // Still pending, poll again
        setTimeout(poll, 1000);
      } else {
        setStatus('⏱️ Verification timeout - check status later');
      }
    };

    await poll();
  };

  return (
    <div className="worker-flow">
      <h1>Worker Loan Flow (Wave 2)</h1>

      <div className="status">
        <p>{status}</p>
      </div>

      <div className="actions">
        <button onClick={registerWorker}>
          1. Register Worker
        </button>

        <button onClick={() => recordIncome(1500, IncomeSource.MANUAL)}>
          2. Record Income ($1500 - Manual)
        </button>

        <button onClick={viewBalance}>
          3. View My Balance (NEW) ⭐
        </button>

        <button onClick={() => createLoan(1000, 500)}>
          4. Request Loan ($1000, need $500 income)
        </button>

        {loanId && (
          <button onClick={() => pollLoanStatus(loanId)}>
            5. Check Loan Status
          </button>
        )}
      </div>

      <div className="info">
        <h3>Wave 2 Features Used:</h3>
        <ul>
          <li>✅ recordIncome() with source parameter</li>
          <li>✅ getMyMonthlyIncome() getter</li>
          <li>✅ CoFHE unseal() for decryption</li>
          <li>✅ Backend automatic escrow + verification</li>
        </ul>
      </div>
    </div>
  );
}
```

### Usage in App

```typescript
// src/App.tsx
import { WorkerLoanFlow } from './flows/WorkerLoanFlow';

function App() {
  return (
    <div className="app">
      <WorkerLoanFlow />
    </div>
  );
}
```

### Expected Output

```
Status: Registering on-chain...
Status: Registered on-chain ✓
Status: Registering in backend...
Status: Worker registered ✓

Status: Recording income ($1500)...
Status: Submitting to blockchain...
Status: Income recorded ✓ (Source: MANUAL)

Status: Reading encrypted income...
Status: Decrypting...
Status: Your monthly income: $1500.00 ✓

Status: Creating loan ($1000)...
Status: Loan created ✓ (ID: abc12345...)
Status: Backend creating escrow...
Status: FHE verification in progress...
Status: Checking verification status (1/30)...
Status: Checking verification status (2/30)...
...
Status: ✅ LOAN APPROVED! Income sufficient.
```

---

## 📦 Useful Links

### Backend Resources
- **Backend URL:** https://lendi-origins.vercel.app
- **API Docs:** https://lendi-origins.vercel.app/api/v1/docs/openapi.json
- **Health Check:** https://lendi-origins.vercel.app/api/health

### Blockchain
- **Block Explorer:** https://sepolia.arbiscan.io/
- **LendiProof Contract:** https://sepolia.arbiscan.io/address/0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac#code
- **Faucet:** https://arbitrum-sepolia.bridge.io
- **CoFHE Docs:** https://cofhe-docs.fhenix.zone

### Documentation
- **Deployment Summary:** `../contracts/DEPLOYMENT_SUMMARY_WAVE2.md`
- **Backend Env Vars:** `../backend/VERCEL_ENV_VARS_WAVE2.txt`

---

## 🎯 Summary

**Wave 2 is LIVE!** 🚀

- ✅ All contracts deployed & verified on Arbitrum Sepolia
- ✅ Backend updated with new addresses & enum support
- ✅ Backend signer registered as lender
- ✅ 262/262 backend tests passing
- ✅ 26/26 contract tests passing
- ✅ **Ready for Phase 4 Worker Flow integration**

**Next Steps:**
1. Update frontend `.env` with new addresses
2. Update `LendiProofABI` with new functions
3. Implement `BalanceView` component
4. Test E2E: Register → Record Income → View Balance → Create Loan

**Time Estimate:** 1-2 days for experienced developer

---

---

## 📊 Quick Reference Summary

### Wave 2 Complete Loan Flow at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                    WORKER → LOAN → SETTLEMENT                     │
└──────────────────────────────────────────────────────────────────┘

Frontend Actions:
├─ 1️⃣ Register Worker
│   ├─ On-chain: lendiProof.registerWorker()
│   └─ Backend: POST /api/v1/workers
│
├─ 2️⃣ Record Income ⭐ UPDATED
│   ├─ Encrypt: cofhe.encrypt([Encryptable.uint64(amount)])
│   └─ On-chain: lendiProof.recordIncome(encrypted, source)
│
├─ 3️⃣ View Balance ⭐ NEW
│   ├─ On-chain: lendiProof.getMyMonthlyIncome() → handle
│   └─ Decrypt: cofhe.unseal(handle) → amount
│
├─ 4️⃣ Create Loan
│   └─ Backend: POST /api/v1/loans
│
└─ 5️⃣ Poll Status
    └─ Backend: GET /api/v1/loans/:id (every 1s)

Backend Actions (Automatic):
├─ Create Escrow (ReinieraOS)
├─ Link Escrow to Worker Income
├─ Request FHE Verification
├─ Wait for Verification (10-30s)
├─ Update Loan Status
└─ Emit Settlement Event
```

### Key Changes Wave 1 → Wave 2

| Feature | Wave 1 | Wave 2 |
|---------|--------|--------|
| **recordIncome signature** | `recordIncome(encAmount)` | `recordIncome(encAmount, source)` ⭐ |
| **Income visibility** | ❌ No getter | ✅ `getMyMonthlyIncome()` ⭐ |
| **Transaction count** | ❌ No getter | ✅ `getMyTxCount()` ⭐ |
| **Lender sealed view** | ❌ No getter | ✅ `getSealedMonthlyIncome(worker)` ⭐ |
| **IncomeRecorded event** | `(worker, timestamp)` | `(worker, timestamp, source)` ⭐ |
| **IncomeSource tracking** | ❌ Not tracked | ✅ Enum (MANUAL, PRIVARA, etc.) ⭐ |
| **Contract addresses** | Wave 1 addresses | New Wave 2 addresses ⭐ |
| **Test coverage** | 52 tests | 26 tests (simplified) |

### Essential Code Snippets

**Record Income (Wave 2)**
```typescript
await lendiProof.recordIncome(encrypted, IncomeSource.MANUAL);
```

**View Balance (Wave 2)**
```typescript
const handle = await lendiProof.getMyMonthlyIncome();
const amount = await cofhe.unseal(LENDI_PROOF_ADDRESS, handle);
console.log(`Balance: $${Number(amount) / 1_000_000}`);
```

**Create Loan**
```typescript
const loan = await fetch('/api/v1/loans', {
  method: 'POST',
  body: JSON.stringify({
    worker_id, worker_address, beneficiary,
    loan_amount_usdc: 1000, threshold_usdc: 500
  })
});
```

**Poll Status**
```typescript
const poll = async () => {
  const { status } = await fetch(`/api/v1/loans/${loanId}`).then(r => r.json());
  if (status === 'approved') return 'Approved!';
  if (status === 'rejected') return 'Rejected';
  setTimeout(poll, 1000); // Retry
};
```

### Implementation Checklist

**Phase 4 Frontend (Priority)**
- [ ] Update `.env` with Wave 2 contract addresses
- [ ] Update `LendiProofABI.ts` with new getters
- [ ] Create `IncomeSource` enum in `types/income.ts`
- [ ] Implement `useWorkerIncome()` hook with `getMyMonthlyIncome()`
- [ ] Implement `BalanceView` component with decryption
- [ ] Update `recordIncome` calls to include `source` parameter
- [ ] Implement `IncomeHistory` component with source icons
- [ ] Test E2E flow: Register → Record → View Balance → Request Loan

**Already Done (Backend)**
- ✅ Backend contracts deployed to Wave 2 addresses
- ✅ Backend ABIs updated with new functions
- ✅ Backend webhook handles `source` field
- ✅ Backend signer registered as lender
- ✅ 262/262 backend tests passing

### Troubleshooting Quick Reference

| Error | Solution |
|-------|----------|
| "Worker not registered" | Call `registerWorker()` first |
| "Wrong number of arguments" | Update to Wave 2 ABI with `source` param |
| "Invalid token" (401) | Re-authenticate with SIWE |
| "Insufficient income" (422) | Record more income before requesting loan |
| "FHE verification timeout" | Wait up to 30s, check RPC connection |
| Contract addresses not working | Update to Wave 2 addresses in `.env` |

### Performance Expectations

| Operation | Time | Gas Cost |
|-----------|------|----------|
| Register Worker | ~5s | ~50k gas |
| Record Income (FHE) | ~10s | ~120k gas |
| View Balance (decrypt) | ~5-10s | Free (view) |
| Create Loan (backend) | ~15-30s | Backend pays |
| FHE Verification | ~10-30s | Backend pays |

---

**¡Éxito con Wave 2! 🚀**
