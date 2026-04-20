# FRONTEND_CLAUDE_CODE_PROMPT.md
## Lendi — Frontend Build Instructions for Claude Code (Wave 2)

> Paste this into Claude Code. Builds the Wave 2 product app. This is separate from the Wave 1 marketing site at lendi-ten.vercel.app.

---

## Project Context

**Lendi** — privacy-first P2P lending for informal workers in LATAM.
*"Prove what you earn. Reveal nothing. Deploy capital without unprotected risk."*

**Wave 1 already exists:**
- `LendiProof.sol` + `LendiProofGate.sol` on Arbitrum Sepolia (being redeployed — see addresses below)
- Marketing landing at `lendi-ten.vercel.app` — do NOT touch this
- 24 tests passing in `LendiProof/dapp/`

**Wave 2 builds a new product app** — the actual app workers and lenders use. Bootstrapped from `platform-modules` by ReinieraOS.

---

## ⚠️ Two Critical Breaking Changes

### 1. Use @cofhe/sdk/web — cofhejs is deprecated this week (Lauren/Fhenix)
```bash
npm install @cofhe/sdk
npm uninstall cofhejs
```

Old pattern (DO NOT USE):
```typescript
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web'
await cofhejs.initialize(...)
await cofhejs.encrypt(...)
```

New pattern:
```typescript
import { createCofheClient, createCofheConfig, Encryptable, FheTypes } from '@cofhe/sdk/web'
const client = await createCofheClient(createCofheConfig({ supportedChains: [arbitrumSepolia] }))
await client.connect(publicClient, walletClient)
await client.encryptInputs([Encryptable.uint64(raw)]).execute()
await client.decryptForView(handle, FheTypes.Uint64).execute()
```

### 2. escrowId is uint256 — NOT bytes32 (Alexander/ReinieraOS)
`IConditionResolver` from ReinieraOS uses `uint256`. Contracts redeployed with this fix.
All `escrowId` references must be `bigint`.

---

## Deployed Contracts — Arbitrum Sepolia

```typescript
// src/config/contracts.ts
export const CONTRACTS = {
  lendiProof:     import.meta.env.VITE_LENDI_PROOF_ADDRESS as `0x${string}`,
  lendiProofGate: import.meta.env.VITE_LENDI_PROOF_GATE_ADDRESS as `0x${string}`,
  lendiPolicy:    import.meta.env.VITE_LENDI_POLICY_ADDRESS as `0x${string}`,
  usdc:           '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  // ReinieraOS — baked into SDK, no manual config needed:
  // confidentialEscrow: '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa'
  chainId:        421614,
  rpc:            'https://sepolia-rollup.arbitrum.io/rpc',
  explorer:       'https://sepolia.arbiscan.io',
}
```

---

## Tech Stack

```
Framework:       React 19 + TypeScript + Vite 6
Routing:         TanStack Router (file-based)
State:           Zustand
Data:            TanStack Query
Auth / AA:       ZeroDev ERC-4337 (passkey + social login)
FHE:             @cofhe/sdk/web  ← NOT cofhejs (deprecated)
Income events:   @reineira-os/sdk
AI Advisor:      @mlc-ai/web-llm (local browser, zero server calls)
UI:              TailwindCSS + shadcn/ui
Language:        Spanish-first
Deploy:          Vercel (separate project from lendi-ten.vercel.app)
```

---

## Setup

```bash
# Monorepo already bootstrapped by Atlas
cd lendi-app/packages/app

npm install @cofhe/sdk @mlc-ai/web-llm @reineira-os/sdk
npm uninstall cofhejs
```

**vite.config.ts** — required for @cofhe/sdk WASM + ZeroDev WebAuthn:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  define: { global: 'globalThis' },
})
```

---

## Contract ABIs

### LendiProof ABI — with uint256 escrowId

```typescript
// src/abi/lendi-proof.json (or inline)
export const LENDI_PROOF_ABI = [
  {
    name: 'registerWorker', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'recordIncome', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'encAmount', type: 'bytes32', internalType: 'InEuint64' }],
    outputs: [],
  },
  {
    name: 'proveIncome', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'worker', type: 'address' }, { name: 'threshold', type: 'uint64' }],
    outputs: [{ name: '', type: 'bytes32', internalType: 'ebool' }],
  },
  {
    name: 'linkEscrow', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId',  type: 'uint256' },   // uint256 — NOT bytes32
      { name: 'worker',    type: 'address' },
      { name: 'threshold', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    name: 'registeredWorkers', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'WorkerRegistered', type: 'event',
    inputs: [{ name: 'worker', type: 'address', indexed: true }],
  },
  {
    name: 'IncomeRecorded', type: 'event',
    inputs: [
      { name: 'worker',    type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ProofRequested', type: 'event',
    inputs: [
      { name: 'lender', type: 'address', indexed: true },
      { name: 'worker', type: 'address', indexed: true },
    ],
  },
] as const
```

---

## Hooks — Implementation

### useCofhe.ts — @cofhe/sdk/web

```typescript
import { createCofheClient, createCofheConfig, Encryptable, FheTypes } from '@cofhe/sdk/web'
import { arbitrumSepolia } from 'viem/chains'

export function useCofhe() {
  const [client, setClient] = useState<any>(null)

  const initialize = async (publicClient: any, walletClient: any) => {
    const config = createCofheConfig({ supportedChains: [arbitrumSepolia] })
    const c      = await createCofheClient(config)
    await c.connect(publicClient, walletClient)
    setClient(c)
  }

  const encryptIncome = async (amountUSDC: number) => {
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint64(BigInt(Math.floor(amountUSDC * 1_000_000)))])
      .execute()
    return encrypted
  }

  const unsealIncome = async (handle: bigint): Promise<number> => {
    const { decryptedValue } = await client.decryptForView(handle, FheTypes.Uint64).execute()
    return Number(decryptedValue) / 1_000_000
  }

  const unsealBool = async (handle: bigint): Promise<boolean> => {
    const { decryptedValue } = await client.decryptForView(handle, FheTypes.Bool).execute()
    return Boolean(decryptedValue)
  }

  return { initialize, encryptIncome, unsealIncome, unsealBool }
}
```

### useAuth.ts — ZeroDev

```typescript
export function useAuth() {
  const { createPasskey, smartAccount } = useZeroDev()

  const onboard = async () => {
    await createPasskey() // no seed phrase, no gas
    await writeContract({ address: CONTRACTS.lendiProof, abi: LENDI_PROOF_ABI, functionName: 'registerWorker' })
  }

  return { onboard, smartAccount }
}
```

### useReinieraIncome.ts — auto income capture

```typescript
import { ReinieraClient } from '@reineira-os/sdk'

export function useReinieraIncome(workerAddress: string) {
  const { encryptIncome } = useCofhe()

  const startListening = () => {
    const client = new ReinieraClient({ network: 'arbitrum-sepolia' })
    client.onPaymentReceived(workerAddress, async (payment) => {
      const encrypted = await encryptIncome(Number(payment.amount) / 1_000_000)
      await writeContract({ address: CONTRACTS.lendiProof, abi: LENDI_PROOF_ABI,
        functionName: 'recordIncome', args: [encrypted] })
    })
  }

  return { startListening }
}
```

### useAIAdvisor.ts — WebLLM local

```typescript
import { CreateMLCEngine } from '@mlc-ai/web-llm'

export function useAIAdvisor() {
  const [engine, setEngine]     = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const init = async () => {
    const e = await CreateMLCEngine('Llama-3.2-3B-Instruct-q4f32_1-MLC',
      { initProgressCallback: (p: any) => setProgress(p.progress * 100) })
    setEngine(e)
  }

  const ask = async (incomeUSDC: number, question: string) => {
    // incomeUSDC in RAM only — zero server calls
    const res = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres un asesor financiero para trabajadores informales en Colombia. Responde en español, conciso.' },
        { role: 'user',   content: `Mi ingreso mensual es $${incomeUSDC.toFixed(2)} USDC. ${question}` },
      ],
      max_tokens: 300,
    })
    return res.choices[0].message.content
  }

  return { init, ask, progress }
}
```

---

## Screens to Build

### Screen 1 — WorkerDashboard (`/worker`)

**Must show:**
- ZeroDev login → `registerWorker()` on first visit
- Auto-capture status from Privara (`useReinieraIncome`)
- `EncryptionStep`: `$350 USDC → cifrando... → 0x1a4f...` — make this visible
- "Ver mi ingreso" → `unsealIncome` in RAM only → `🔒 $350.00 — Solo tú puedes verlo`
- `IncomeHistory`: timestamps + source only — NO amounts ever
- `TxStatus` for all CoFHE operations (10-30s expected)

**Privacy rule:** income amount shown only in this view, only to the worker, only in RAM.

---

### Screen 2 — LenderVerify (`/lender/verify`)

**Must show:**
- Worker address input
- Threshold input (minimum USDC/month)
- "Verificar" → `proveIncome()` → CoFHE processes → `unsealBool`
- Large result: `✅ Califica` or `❌ No califica`
- Statement: *"El monto de ingreso nunca fue revelado."*
- Arbiscan link to `ProofRequested` event

**Privacy rule:** income amount NEVER appears in this view, not even blurred.

---

### Screen 3 — AI Advisor (`/worker/advisor`)

- Load WebLLM on first open (progress bar — first load ~2GB, then cached)
- Suggested prompts: "¿Puedo pagar un préstamo de $200?", "¿En cuántos meses califico para más?"
- Income decrypted in RAM → passed to local model → RAM cleared on unmount
- No network calls during inference

---

## CoFHE Status Messages (Spanish)

```typescript
// components/shared/TxStatus.tsx
const MESSAGES = {
  idle:        '',
  encrypting:  'Cifrando en tu dispositivo...',
  submitting:  'Enviando a la blockchain...',
  processing:  'Comparación FHE procesando (10–30s)...',
  done:        '¡Listo!',
  error:       'Error — intenta de nuevo',
}
```

---

## Suggested Build Order

1. Shell — `__root.tsx` + router + layout + theme
2. `config/contracts` + viem read
3. `WalletButton` + ZeroDev (one successful userOp)
4. `useCofhe` + `WorkerOnboarding` + manual `IncomeCapture` + `recordIncome`
5. `TxStatus` + `EncryptionStep`
6. `VerifyIncome` (lender path)
7. API services + auth (SIWE → backend JWT)
8. `IncomeHistory` from backend API
9. `useReinieraIncome` when SDK + keys confirmed
10. `EscrowCreator` + `useLoanFlow`
11. `advisor.tsx` + WebLLM
12. Spanish i18n, responsive polish, Vercel

---

## Design

```css
:root {
  --color-primary:   #22c55e;  /* green — trust, money */
  --color-danger:    #ef4444;
  --color-encrypted: #6366f1;  /* purple — FHE indicator */
  --bg:              #0a0a0a;
  --surface:         #141414;
  --border:          #2a2a2a;
  --text:            #f5f5f5;
  --text-muted:      #737373;
}
```

- `IBM Plex Mono` for encrypted values and addresses
- `Inter` or `DM Sans` for body text
- Mobile-first (Colombia is Android-dominant market)
- Dark by default, warmth in interactions

---

## Vercel

```bash
vercel --prod

# Env vars to set:
VITE_LENDI_PROOF_ADDRESS=<after deploy>
VITE_LENDI_PROOF_GATE_ADDRESS=<after deploy>
VITE_LENDI_POLICY_ADDRESS=<after deploy>
VITE_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
VITE_ZERODEV_BUNDLER_URL=...
VITE_ZERODEV_PASSKEY_SERVER_URL=...
VITE_API_BASE_URL=https://lendi-backend.vercel.app/api
VITE_CHAIN_ID=421614
```

---

## Definition of Done

- [ ] `@cofhe/sdk/web` used throughout — `cofhejs` removed
- [ ] All `escrowId` references are `bigint` (uint256)
- [ ] ZeroDev passkey login — no seed phrase, no gas
- [ ] Income auto-captured from Privara events
- [ ] `recordIncome()` with encrypted amount — plaintext never leaves device
- [ ] Worker views balance in RAM only
- [ ] Lender sees ✅ or ❌ — never income amount
- [ ] AI advisor fully local — zero server calls
- [ ] All worker strings in Spanish
- [ ] Mobile-responsive
- [ ] CoFHE async states visible
- [ ] Deployed on Vercel — separate from lendi-ten.vercel.app

---

## What This App Does NOT Include

- ❌ ProtectionPool UI (Wave 3)
- ❌ @informalproof/sdk npm package (Wave 3)
- ❌ Multi-currency (USDC only)
- ❌ iOS native app

---

*Lendi | @cofhe/sdk (migrated) | uint256 escrowId | Wave 2*
