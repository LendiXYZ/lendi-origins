import { useState } from 'react'
import { useLoanFlow } from '@/hooks/useLoanFlow'
import { TxStatus } from '@/components/shared/TxStatus'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CONTRACTS } from '@/config/contracts'
import type { TxState } from '@/components/shared/TxStatus'

const STEP_TO_TX: Record<string, TxState> = {
  idle:       'idle',
  'fhe-init': 'encrypting',
  wrapping:   'encrypting',
  submitting: 'submitting',
  funding:    'submitting',
  done:       'done',
  error:      'error',
}

export interface CreatedEscrowInfo {
  escrowId: string
  txHash: string
  amount: number
  workerAddress: string
}

interface EscrowCreatorProps {
  onCreated?: (info: CreatedEscrowInfo) => void
}

export function EscrowCreator({ onCreated }: EscrowCreatorProps) {
  const [worker, setWorker] = useState('')
  const [amount, setAmount] = useState('')
  const [threshold, setThreshold] = useState('')

  const { step, error, txHash, escrowId, execute, reset } = useLoanFlow()

  const workerValid = /^0x[0-9a-fA-F]{40}$/.test(worker.trim())
  const amountParsed = parseFloat(amount)
  const thresholdParsed = parseFloat(threshold)
  const canSubmit = workerValid && !isNaN(amountParsed) && amountParsed > 0 && !isNaN(thresholdParsed) && thresholdParsed > 0

  const busy = step === 'fhe-init' || step === 'wrapping' || step === 'submitting' || step === 'funding'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const result = await execute({ workerAddress: worker.trim(), loanAmount: amountParsed, threshold: thresholdParsed })
    if (result) {
      onCreated?.({
        escrowId: result.escrowId.toString(),
        txHash: result.txHash,
        amount: amountParsed,
        workerAddress: worker.trim(),
      })
    }
  }

  function handleReset() {
    reset()
    setWorker('')
    setAmount('')
    setThreshold('')
  }

  if (step === 'done' && escrowId !== null) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: 'var(--status-success)' }}>✓</span>
          <p className="font-semibold text-[var(--text-primary)]">Escrow creado</p>
        </div>

        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Escrow ID</p>
          <p className="font-mono text-sm text-[var(--text-primary)]">{escrowId.toString()}</p>
        </div>

        {txHash && (
          <a
            href={`${CONTRACTS.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent-blue)] hover:underline"
          >
            Ver en Blockscout ↗
          </a>
        )}

        <p className="text-xs font-mono text-[var(--text-muted)]">
          El ingreso del worker nunca fue revelado.
        </p>

        <Button variant="secondary" size="sm" onClick={handleReset}>
          Crear otro escrow
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4"
    >
      <h3 className="font-semibold text-[var(--text-primary)]">Crear Escrow de Préstamo</h3>

      <Input
        label="Dirección del Worker"
        placeholder="0x..."
        value={worker}
        onChange={(e) => setWorker(e.target.value)}
        disabled={busy}
      />

      <Input
        label="Monto del préstamo (USDC)"
        type="number"
        min="1"
        step="1"
        placeholder="1000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={busy}
      />

      <Input
        label="Ingreso mínimo requerido (USDC/mes)"
        type="number"
        min="1"
        step="1"
        placeholder="500"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        disabled={busy}
      />

      <Button type="submit" loading={busy} disabled={!canSubmit || busy}>
        {step === 'fhe-init'  ? 'Iniciando FHE...'
        : step === 'wrapping'   ? 'Envolviendo USDC...'
        : step === 'submitting' ? 'Creando escrow...'
        : step === 'funding'    ? 'Fondeando escrow...'
        : 'Crear Escrow'}
      </Button>

      {step !== 'idle' && (
        <TxStatus state={STEP_TO_TX[step]} errorMessage={error ?? undefined} />
      )}
    </form>
  )
}
