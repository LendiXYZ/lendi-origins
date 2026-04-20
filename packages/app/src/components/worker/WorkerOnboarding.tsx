import { useEffect, useState, type ReactNode } from 'react'
import type { Abi } from 'viem'
import { useWalletStore } from '@/stores/wallet-store'
import { useContractCall } from '@/hooks/use-contract-call'
import { publicClient } from '@/lib/viem-clients'
import { CONTRACTS } from '@/config/contracts'
import { TxStatus, type TxState } from '@/components/shared/TxStatus'
import { WalletButton } from '@/components/shared/WalletButton'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'
import LENDI_PROOF_ABI from '@/abi/lendi-proof.json'

interface WorkerOnboardingProps {
  children: ReactNode
}

/**
 * Guard wrapper: checks registeredWorkers(address) on-chain.
 * - Not connected  → prompt to connect wallet
 * - Not registered → show passkey + registerWorker() UI
 * - Registered     → render children
 */
export function WorkerOnboarding({ children }: WorkerOnboardingProps) {
  const address = useWalletStore((s) => s.address)

  const [checking,     setChecking]     = useState(true)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [txState,      setTxState]      = useState<TxState>('idle')

  const { executeCall, loading, error } = useContractCall()

  // ── On-chain guard check ────────────────────────────────────────────────
  useEffect(() => {
    if (!address) {
      setChecking(false)
      return
    }

    setChecking(true)
    publicClient
      .readContract({
        address:      CONTRACTS.lendiProof,
        abi:          LENDI_PROOF_ABI as Abi,
        functionName: 'registeredWorkers',
        args:         [address as `0x${string}`],
      })
      .then((result) => setIsRegistered(result as boolean))
      .catch(() => setIsRegistered(false))
      .finally(() => setChecking(false))
  }, [address])

  // ── registerWorker() via ZeroDev userOp ────────────────────────────────
  async function handleRegister() {
    setTxState('submitting')
    try {
      await executeCall(
        CONTRACTS.lendiProof,
        LENDI_PROOF_ABI as Abi,
        'registerWorker',
        [],
      )
      setIsRegistered(true)
      setTxState('done')
    } catch {
      setTxState('error')
    }
  }

  // ── Wallet not connected ────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-[var(--text-secondary)]">
          Conecta tu cuenta para continuar
        </p>
        <WalletButton />
      </div>
    )
  }

  // ── Checking on-chain state ─────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Verificando cuenta en la blockchain...
      </div>
    )
  }

  // ── Registered → render children ───────────────────────────────────────
  if (isRegistered) {
    return <>{children}</>
  }

  // ── Not registered → onboarding UI ─────────────────────────────────────
  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {strings.worker.onboarding.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.worker.onboarding.subtitle}
          </p>
        </div>

        <ul className="mb-5 space-y-2 text-sm text-[var(--text-secondary)]">
          <li className="flex items-center gap-2">
            <span className="text-[var(--accent-blue)]">✓</span>
            Sin gas — ZeroDev paga las comisiones
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--accent-blue)]">✓</span>
            Sin semilla — clave de paso en tu dispositivo
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--accent-blue)]">✓</span>
            Tu ingreso permanece cifrado en todo momento
          </li>
        </ul>

        <Button
          className="w-full"
          loading={loading}
          onClick={handleRegister}
          disabled={txState === 'done'}
        >
          {strings.worker.onboarding.registerCta}
        </Button>

        {txState !== 'idle' && (
          <div className="mt-3">
            <TxStatus
              state={txState}
              errorMessage={error ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
