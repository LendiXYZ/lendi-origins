import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useLendiProof } from '@/hooks/useLendiProof'
import { useCofhe } from '@/hooks/useCofhe'
import { useX402Payment } from '@/hooks/useX402Payment'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { TxStatus } from '@/components/shared/TxStatus'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'
import { CONTRACTS } from '@/config/contracts'
import { API_BASE_URL } from '@/config/constants'
import type { TxState } from '@/components/shared/TxStatus'

// x402 payment receiver on Base Sepolia
const X402_RECEIVER = '0x799795DDef56d71A4d98Fac65cb88B7389614aBC'

export function VerifyIncome() {
  const [worker, setWorker] = useState('')
  const [threshold, setThreshold] = useState('')
  const [txState, setTxState] = useState<TxState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLender, setIsLender] = useState<boolean | null>(null)
  const [registering, setRegistering] = useState(false)
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null)
  const [escrowId, setEscrowId] = useState<string | null>(null)

  const { proveIncome, isLenderRegistered, registerLender, fheInitializing } = useLendiProof()
  const { unsealBool, initialize: initFhe } = useCofhe()
  const { payX402, isPaying } = useX402Payment()
  const { address } = useAccount()
  const { ensureJwt } = useAuth()
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    isLenderRegistered().then(setIsLender).catch(() => setIsLender(false))
  }, [isLenderRegistered])

  async function handleRegister() {
    setRegistering(true)
    setErrorMsg(null)
    try {
      await registerLender()
      setIsLender(true)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : strings.errors.generic)
    } finally {
      setRegistering(false)
    }
  }

  const workerValid = /^0x[0-9a-fA-F]{40}$/.test(worker.trim())
  const thresholdParsed = parseFloat(threshold)
  const thresholdValid = !isNaN(thresholdParsed) && thresholdParsed > 0
  const canSubmit = workerValid && thresholdValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setErrorMsg(null)
    setResult(null)
    setTxHash(null)
    setPaymentTxHash(null)
    setEscrowId(null)
    setTxState('submitting')

    try {
      // Step 1: Initialize FHE and prove income (existing flow)
      await initFhe()
      const { txHash: hash, handle } = await proveIncome(worker.trim(), thresholdParsed)
      setTxHash(hash)
      setTxState('processing')

      // Step 2: Decrypt FHE result in browser (existing flow)
      const qualifies = await unsealBool(handle)

      // Step 3: x402 payment + backend verification (NEW)
      try {
        // Ensure JWT exists for API call
        await ensureJwt()

        // Pay $0.001 USDC on Base Sepolia
        console.log('[x402] Paying $0.001 USDC...')
        const x402TxHash = await payX402({
          receiverAddress: X402_RECEIVER,
          amountUsdc: '0.001',
        })
        setPaymentTxHash(x402TxHash)
        console.log('[x402] Payment confirmed:', x402TxHash)

        // Call backend with X-PAYMENT header
        const verifyResponse = await fetch(`${API_BASE_URL}/v1/verify/income`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-PAYMENT': x402TxHash,
          },
          body: JSON.stringify({
            escrowId: hash, // Use txHash as temp escrowId
            workerAddress: worker.trim(),
          }),
        })

        if (!verifyResponse.ok) {
          throw new Error(`Backend verification failed: ${verifyResponse.status}`)
        }

        const verifyData = await verifyResponse.json()
        console.log('[x402] Backend verification:', verifyData)

        // Step 4: Send ERC-8004 feedback (fire and forget)
        if (address) {
          fetch(`${API_BASE_URL}/v1/verification/feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              escrowId: hash,
              eligible: qualifies,
              x402TxHash,
              lenderAddress: address,
            }),
          }).catch((err) => console.warn('[ERC-8004] Feedback failed:', err))
        }
      } catch (x402Error) {
        // x402 failed — log but don't block showing the result
        console.warn('[x402] Payment/verification failed:', x402Error)
        setErrorMsg(
          `Verificación completa, pero el pago x402 falló: ${x402Error instanceof Error ? x402Error.message : 'Error desconocido'}`
        )
      }

      // Step 5: Show result to user
      setResult(qualifies)
      setTxState('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : strings.errors.generic)
      setTxState('error')
    }
  }

  const busy = txState === 'submitting' || txState === 'processing'

  if (isLender === null) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">Verificando acceso...</p>
      </div>
    )
  }

  if (!isLender) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
        <p className="text-sm text-[var(--text-primary)]">
          Tu cuenta no está registrada como prestamista en el protocolo.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          El registro es necesario para poder verificar ingresos cifrados.
        </p>
        {errorMsg && (
          <p className="text-xs text-[var(--status-error)]">{errorMsg}</p>
        )}
        <Button onClick={handleRegister} loading={registering} disabled={registering}>
          Registrarme como Prestamista
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4"
      >
        <Input
          label={strings.lender.verify.workerLabel}
          placeholder={strings.lender.verify.workerPlaceholder}
          value={worker}
          onChange={(e) => setWorker(e.target.value)}
          disabled={busy}
        />

        <Input
          label={strings.lender.verify.thresholdLabel}
          type="number"
          min="1"
          step="1"
          placeholder={strings.lender.verify.thresholdPlaceholder}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          disabled={busy}
        />

        <Button
          type="submit"
          loading={busy || fheInitializing}
          disabled={!canSubmit || busy || fheInitializing}
        >
          {fheInitializing ? 'Iniciando FHE...' : strings.lender.verify.cta}
        </Button>

        {txState !== 'idle' && (
          <TxStatus state={txState} errorMessage={errorMsg ?? undefined} />
        )}
      </form>

      {txState === 'done' && result !== null && (
        <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-center py-4">
            <span
              className="text-5xl font-bold"
              style={{ color: result ? 'var(--status-success)' : 'var(--status-error)' }}
            >
              {result ? strings.lender.verify.qualifies : strings.lender.verify.notQualifies}
            </span>
          </div>

          <p className="text-center text-xs font-mono text-[var(--text-muted)]">
            {strings.lender.verify.privacyStatement}
          </p>

          {paymentTxHash && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--status-success)]/10 border border-[var(--status-success)]/20">
              <span className="text-xs font-medium text-[var(--status-success)]">
                ✅ Verificación pagada · x402 · Base Sepolia
              </span>
              <a
                href={`https://sepolia.basescan.org/tx/${paymentTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-blue)] hover:underline"
              >
                ver tx ↗
              </a>
            </div>
          )}

          {txHash && (
            <a
              href={`${CONTRACTS.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs text-[var(--accent-blue)] hover:underline"
            >
              {strings.lender.verify.viewOnChain} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
