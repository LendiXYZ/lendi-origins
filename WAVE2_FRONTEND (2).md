# WAVE2_FRONTEND.md
## Lendi — Frontend Wave 2 Build Spec

> Product app — separate from the Next.js marketing site at `lendi-ten.vercel.app`. Built on `platform-modules/packages/app` bootstrapped via Atlas.

---

## What Already Exists (Do Not Touch)

```
lendi-landing-page/              ← lendi-ten.vercel.app (Next.js marketing site)
  /                              ← landing, qualification studio
  /demo                          ← wallet + simulate + lender verify
  /join-us/borrower
  /join-us/lender
  → Only change: update CTAs to point to new product app URL

LendiProof/dapp/              ← Hardhat only — contracts + tests
  contracts/
    LendiProof.sol            ← REDEPLOY with uint256 escrowId
    LendiProofGate.sol        ← REDEPLOY with isConditionMet(uint256)
  test/                          ← 24 tests (update after redeploy)
```

---

## ⚠️ Breaking Changes Before Building

### 1. @cofhe/sdk replaces cofhejs (Lauren/Fhenix — deprecated this week)
```bash
npm uninstall cofhejs
npm install @cofhe/sdk
```

### 2. Contract names updated
- `LendiProof.sol` → `LendiProof.sol`
- `LendiProofGate.sol` → `LendiProofGate.sol`
- `LendiPolicy.sol` → NEW contract (Wave 2)

### 3. escrowId: bytes32 → uint256 (Alexander/ReinieraOS — interface alignment)
All three contracts deployed fresh. New addresses go in env after deploy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Routing | TanStack Router (file-based) |
| UI state | Zustand |
| Server state | TanStack Query |
| Styling | Tailwind CSS + shadcn/ui |
| Account / txs | ZeroDev (`@zerodev/sdk`, passkey/social) + viem |
| FHE | `@cofhe/sdk/web` — NOT cofhejs (deprecated) |
| Income / escrow | `@reineira-os/sdk` |
| Local AI | `@mlc-ai/web-llm` |
| HTTP to Lendi API | Axios (match platform-modules pattern) |
| i18n | `es` primary + `en` optional |
| Quality | ESLint + Prettier + Vitest |

---

## Bootstrap

```bash
# Atlas generates monorepo from brief-lendi.md
cd reineira-atlas
claude "/bootstrap"

# Wire deployed contracts
claude "/integrate"

# Additional deps
cd lendi-app/packages/app
npm install @cofhe/sdk @mlc-ai/web-llm @reineira-os/sdk
npm uninstall cofhejs
```

---

## Environment Variables

```env
# packages/app/.env

VITE_API_BASE_URL=https://lendi-backend.vercel.app/api

VITE_ZERODEV_PROJECT_ID=
VITE_ZERODEV_BUNDLER_URL=
VITE_ZERODEV_PASSKEY_SERVER_URL=

# Update after deploy (new contract names)
VITE_LENDI_PROOF_ADDRESS=TBD
VITE_LENDI_PROOF_GATE_ADDRESS=TBD
VITE_LENDI_POLICY_ADDRESS=TBD
VITE_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# ReinieraOS — baked into SDK, no config needed
# ConfidentialEscrow: 0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
# ConfidentialCoverageManager: 0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6
# PoolFactory: 0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
VITE_CHAIN_ID=421614
VITE_COFHE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

---

## Folder Structure

```
packages/app/
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.ts             # COOP/COEP headers for ZeroDev + @cofhe/sdk WASM
├── package.json
├── tsconfig.json
├── .env.example
│
└── src/
    ├── main.tsx               # entry + root providers
    ├── router.tsx             # createRouter, routeTree
    │
    ├── routes/
    │   ├── __root.tsx         # global layout, providers, outlet
    │   ├── index.tsx          # redirect → /worker or /lender
    │   │
    │   ├── worker/
    │   │   ├── index.tsx      # WorkerDashboard
    │   │   ├── income.tsx     # history + capture
    │   │   ├── apply.tsx      # loan / escrow application
    │   │   └── advisor.tsx    # WebLLM AI chat
    │   │
    │   └── lender/
    │       ├── index.tsx      # LenderDashboard
    │       ├── verify.tsx     # proveIncome → ✅/❌
    │       └── portfolio.tsx  # loans / escrows
    │
    ├── components/
    │   ├── ui/                # shadcn primitives
    │   │
    │   ├── shared/
    │   │   ├── WalletButton.tsx
    │   │   ├── TxStatus.tsx
    │   │   ├── EncryptionStep.tsx
    │   │   ├── PrivacyNote.tsx
    │   │   ├── AppHeader.tsx
    │   │   └── ErrorBoundary.tsx
    │   │
    │   ├── worker/
    │   │   ├── WorkerOnboarding.tsx
    │   │   ├── IncomeCapture.tsx
    │   │   ├── IncomeHistory.tsx
    │   │   ├── BalanceView.tsx
    │   │   └── LoanApply.tsx
    │   │
    │   └── lender/
    │       ├── VerifyIncome.tsx
    │       ├── EscrowCreator.tsx
    │       └── PortfolioTable.tsx
    │
    ├── hooks/
    │   ├── useCofhe.ts        # @cofhe/sdk/web — encrypt + unseal
    │   ├── useLendiProof.ts
    │   ├── useReinieraIncome.ts
    │   ├── useAIAdvisor.ts
    │   ├── useAuth.ts
    │   └── useLoanFlow.ts
    │
    ├── stores/
    │   ├── walletStore.ts
    │   ├── cofheStore.ts      # encryption step state + handles
    │   ├── incomeStore.ts
    │   ├── loanStore.ts
    │   └── uiStore.ts
    │
    ├── services/
    │   ├── apiClient.ts
    │   ├── authService.ts
    │   ├── workerService.ts
    │   ├── incomeService.ts
    │   └── loanService.ts
    │
    ├── providers/
    │   ├── ZeroDevProvider.tsx
    │   ├── QueryClientProvider.tsx
    │   ├── RouterProvider.tsx
    │   └── ThemeProvider.tsx
    │
    ├── config/
    │   ├── contracts.ts       # addresses + ABIs from import.meta.env
    │   ├── chains.ts
    │   └── constants.ts
    │
    ├── lib/
    │   ├── viem-clients.ts
    │   ├── format.ts
    │   └── errors.ts
    │
    ├── abi/
    │   ├── informal-proof.json
    │   └── informal-proof-gate.json
    │
    ├── i18n/
    │   ├── index.ts
    │   ├── es.ts              # all user-visible strings (primary)
    │   └── en.ts
    │
    ├── types/
    │   ├── api.ts
    │   └── contracts.ts
    │
    └── styles/
        └── main.css           # CSS vars: --color-primary, --radius, light/dark
```

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Redirect or role picker |
| `/worker` | Worker dashboard |
| `/worker/income` | Capture + history |
| `/worker/apply` | Loan flow |
| `/worker/advisor` | WebLLM |
| `/lender` | Lender dashboard |
| `/lender/verify` | Income proof |
| `/lender/portfolio` | Escrows / loans |

---

## Components Checklist

### Shared
- [ ] `WalletButton` — ZeroDev connect / account state
- [ ] `TxStatus` — `idle | encrypting | submitting | processing | done | error`
- [ ] `EncryptionStep` — `$350 → cifrando... → 0x1a4f...` visual
- [ ] `PrivacyNote` — "solo tú puedes ver esto"
- [ ] `AppHeader` — worker vs lender nav
- [ ] `LoadingSpinner` / `EmptyState`

### Worker
- [ ] `WorkerOnboarding` — guided `registerWorker` (ZeroDev social login)
- [ ] `IncomeCapture` — manual entry + Privara listener status
- [ ] `IncomeHistory` — timestamps + source only, NO amounts in rows
- [ ] `BalanceView` — `decryptForView` in client RAM only
- [ ] `LoanApply` — form + escrow creation CTA

### Lender
- [ ] `VerifyIncome` — worker address + threshold → boolean result
- [ ] `EscrowCreator` — ReinieraOS SDK create escrow
- [ ] `PortfolioTable` — per-row status

### UI (shadcn)
- [ ] `Input`, `Label`, `Button`, `Select`
- [ ] `Card`, `Dialog`, `Toast`/`Sonner`, `Tabs`

---

## FHE Hook — @cofhe/sdk/web

```typescript
// hooks/useCofhe.ts
// ⚠️ @cofhe/sdk/web — cofhejs is deprecated as of this week
import {
  createCofheClient,
  createCofheConfig,
  Encryptable,
  FheTypes,
} from '@cofhe/sdk/web'
import { arbitrumSepolia } from 'viem/chains'

export function useCofhe() {
  const [client, setClient] = useState<any>(null)

  const initialize = async (publicClient: any, walletClient: any) => {
    const config = createCofheConfig({ supportedChains: [arbitrumSepolia] })
    const c      = await createCofheClient(config)
    await c.connect(publicClient, walletClient)
    setClient(c)
  }

  // Encrypt on device — plaintext never leaves
  const encryptIncome = async (amountUSDC: number) => {
    const raw = BigInt(Math.floor(amountUSDC * 1_000_000))
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint64(raw)])
      .execute()
    return encrypted
  }

  // Decrypt in RAM only
  const unsealIncome = async (handle: bigint): Promise<number> => {
    const { decryptedValue } = await client
      .decryptForView(handle, FheTypes.Uint64)
      .execute()
    return Number(decryptedValue) / 1_000_000
  }

  const unsealBool = async (handle: bigint): Promise<boolean> => {
    const { decryptedValue } = await client
      .decryptForView(handle, FheTypes.Bool)
      .execute()
    return Boolean(decryptedValue)
  }

  return { initialize, encryptIncome, unsealIncome, unsealBool }
}
```

---

## ZeroDev Auth

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { createPasskey, smartAccount } = useZeroDev()

  const onboard = async () => {
    await createPasskey() // no seed phrase, no gas
    await writeContract({
      address:      CONTRACTS.lendiProof,
      abi:          LENDI_PROOF_ABI,
      functionName: 'registerWorker',
    })
  }

  return { onboard, smartAccount }
}
```

---

## Income Capture

```typescript
// hooks/useReinieraIncome.ts
import { ReinieraClient } from '@reineira-os/sdk'

export function useReinieraIncome(workerAddress: string) {
  const { encryptIncome } = useCofhe()

  const startListening = () => {
    const client = new ReinieraClient({ network: 'arbitrum-sepolia' })
    client.onPaymentReceived(workerAddress, async (payment) => {
      const encrypted = await encryptIncome(Number(payment.amount) / 1_000_000)
      await writeContract({
        address: CONTRACTS.lendiProof,
        abi:     LENDI_PROOF_ABI,
        functionName: 'recordIncome',
        args:    [encrypted],
      })
    })
  }
  return { startListening }
}

// Fallback — direct USDC transfers (workers not yet on Privara)
export async function captureDirectTransfers(workerAddress: string) {
  const transfers = await publicClient.getLogs({
    address: CONTRACTS.usdc,
    event:   parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    args:    { to: workerAddress },
    fromBlock: startOfMonthBlock,
  })
  const total     = transfers.reduce((s, t) => s + t.args.value!, 0n)
  const encrypted = await encryptIncome(Number(total) / 1_000_000)
  await recordIncome(encrypted)
}
```

---

## AI Advisor — WebLLM (Zero Server Calls)

```typescript
// hooks/useAIAdvisor.ts
import { CreateMLCEngine } from '@mlc-ai/web-llm'

export function useAIAdvisor() {
  const [engine, setEngine]     = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const init = async () => {
    const e = await CreateMLCEngine(
      'Llama-3.2-3B-Instruct-q4f32_1-MLC',
      { initProgressCallback: (p: any) => setProgress(p.progress * 100) }
    )
    setEngine(e)
  }

  const ask = async (incomeUSDC: number, question: string) => {
    // incomeUSDC in RAM only — never sent to server
    const res = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'Eres un asesor financiero para trabajadores informales en Colombia. Responde en español, conciso y práctico.' },
        { role: 'user',   content: `Mi ingreso mensual es $${incomeUSDC.toFixed(2)} USDC. ${question}` },
      ],
      max_tokens: 300,
    })
    return res.choices[0].message.content
  }

  return { init, ask, progress }
}
```

Suggested prompts in UI:
- "¿Puedo pagar un préstamo de $200?"
- "¿En cuántos meses califico para más?"
- "¿Cuánto debo ahorrar este mes?"

---

## Stores (Zustand)

| Store | Responsibility |
|---|---|
| `walletStore` | Smart account address, ready flag, errors |
| `cofheStore` | Encryption step state, encrypted handles |
| `incomeStore` | Income events + last tx hash |
| `loanStore` | escrowId, status, active list |
| `uiStore` | Modals, sidebar, theme |

---

## i18n

```typescript
// i18n/es.ts — all user-visible strings
export const es = {
  worker: {
    onboarding: { title: 'Crear cuenta', cta: 'Continuar con Google' },
    income:     { title: 'Mi ingreso este mes', view: 'Ver mi ingreso', recording: 'Cifrando...' },
    apply:      { title: 'Solicitar préstamo', cta: 'Aplicar' },
    advisor:    { title: 'Asesor financiero', placeholder: '¿Puedo pagar un préstamo de $200?' },
  },
  lender: {
    verify:    { title: 'Verificar ingreso', cta: 'Verificar', qualifies: 'Califica ✅', notQualifies: 'No califica ❌' },
    portfolio: { title: 'Mi portafolio' },
  },
  tx: {
    encrypting: 'Cifrando en tu dispositivo...',
    submitting: 'Enviando a la blockchain...',
    processing: 'Comparación FHE procesando (10–30s)...',
    done:       '¡Listo!',
    error:      'Error — intenta de nuevo',
  },
  privacy: { note: 'Solo tú puedes ver esto' },
}
```

---

## Suggested Build Order

1. Shell — `__root.tsx` + router + layout + theme
2. `config/contracts` + viem chain read
3. `WalletButton` + ZeroDev (one successful userOp)
4. `useCofhe` + `WorkerOnboarding` + manual `IncomeCapture` + `recordIncome`
5. `TxStatus` + `EncryptionStep`
6. `VerifyIncome` (lender path)
7. API services + auth
8. `IncomeHistory` from API
9. `useReinieraIncome` when SDK + keys ready
10. `EscrowCreator` + `useLoanFlow`
11. `advisor.tsx` + WebLLM
12. Spanish i18n polish, responsive, Vercel deploy + COOP/COEP

---

## Vercel Deploy

```json
{
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin" },
      { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
    ]
  }]
}
```

COOP/COEP required for ZeroDev WebAuthn and @cofhe/sdk WASM.

---

## Wave 2 Frontend — Definition of Done

- [ ] Contracts redeployed (uint256 escrowId) — env updated
- [ ] `@cofhe/sdk/web` installed — `cofhejs` removed
- [ ] ZeroDev passkey login — no seed phrase, no gas
- [ ] `onPaymentReceived` captures income from Privara automatically
- [ ] viem fallback captures direct USDC transfers
- [ ] `recordIncome()` with encrypted amount — plaintext never leaves device
- [ ] Worker views own balance via `decryptForView` — RAM only
- [ ] Lender sees ✅ or ❌ — never the income amount
- [ ] AI advisor fully local — zero server calls
- [ ] All worker-facing strings in Spanish
- [ ] Mobile-responsive
- [ ] CoFHE async states visible — no silent waits
- [ ] Deployed on Vercel — separate from lendi-ten.vercel.app
- [ ] Landing page `/join-us` CTAs updated to new app URL
