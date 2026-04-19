import { useState, useEffect } from 'react'
import { useLendiProof } from '@/hooks/useLendiProof'
import { useCofhe } from '@/hooks/useCofhe'
import { TxStatus } from '@/components/shared/TxStatus'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'
import { CONTRACTS } from '@/config/contracts'
import type { TxState } from '@/components/shared/TxStatus'

export function VerifyIncome() {
  const [worker, setWorker] = useState('')
  const [threshold, setThreshold] = useState('')
  const [txState, setTxState] = useState<TxState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLender, setIsLender] = useState<boolean | null>(null)
  const [registering, setRegistering] = useState(false)

  const { proveIncome, isLenderRegistered, registerLender, fheInitializing } = useLendiProof()
  const { unsealBool, initialize: initFhe } = useCofhe()

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
    setTxState('submitting')
    try {
      await initFhe()
      const { txHash: hash, handle } = await proveIncome(worker.trim(), thresholdParsed)
      setTxHash(hash)
      setTxState('processing')
      const qualifies = await unsealBool(handle)
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
