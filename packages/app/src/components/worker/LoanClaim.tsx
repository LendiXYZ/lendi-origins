import { useState } from 'react'
import { useRedeemFlow, type ConditionStatus } from '@/hooks/useRedeemFlow'
import { TxStatus } from '@/components/shared/TxStatus'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CONTRACTS } from '@/config/contracts'
import type { TxState } from '@/components/shared/TxStatus'

const STEP_TO_TX: Record<string, TxState> = {
  idle:        'idle',
  checking:    'processing',
  requesting:  'submitting',
  publishing:  'submitting',
  redeeming:   'submitting',
  done:        'done',
  error:       'error',
}

const CONDITION_LABEL: Record<ConditionStatus, { label: string; color: string }> = {
  unknown:         { label: 'Sin verificar', color: 'var(--text-muted)' },
  pending_request: { label: 'Verificación no solicitada', color: 'var(--status-warning)' },
  pending_publish: { label: 'Esperando publicación de resultado...', color: 'var(--status-info)' },
  met:             { label: 'Condición cumplida ✓', color: 'var(--status-success)' },
  not_met:         { label: 'Condición no cumplida', color: 'var(--status-error)' },
}

export function LoanClaim() {
  const [escrowIdInput, setEscrowIdInput] = useState('')

  const { step, error, txHash, conditionStatus, checkCondition, requestVerification, publishVerification, redeem, reset } =
    useRedeemFlow()

  const escrowIdParsed = escrowIdInput.trim() !== '' && /^\d+$/.test(escrowIdInput.trim())
    ? BigInt(escrowIdInput.trim())
    : null

  const busy = step === 'checking' || step === 'requesting' || step === 'publishing' || step === 'redeeming'

  async function handleCheck() {
    if (escrowIdParsed === null) return
    reset()
    await checkCondition(escrowIdParsed)
  }

  async function handleRequestVerification() {
    if (escrowIdParsed === null) return
    await requestVerification(escrowIdParsed)
  }

  async function handlePublish() {
    if (escrowIdParsed === null) return
    await publishVerification(escrowIdParsed)
  }

  async function handleRedeem() {
    if (escrowIdParsed === null) return
    await redeem(escrowIdParsed)
  }

  if (step === 'done' && txHash) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: 'var(--status-success)' }}>✓</span>
          <p className="font-semibold text-[var(--text-primary)]">Fondos recibidos</p>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          El USDC fue transferido a tu wallet. El ingreso nunca fue revelado.
        </p>
        <a
          href={`${CONTRACTS.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--accent-blue)] hover:underline"
        >
          Ver en Blockscout ↗
        </a>
        <p className="text-xs font-mono text-[var(--text-muted)]">
          Escrow ID: {escrowIdInput}
        </p>
        <Button variant="secondary" size="sm" onClick={() => { reset(); setEscrowIdInput('') }}>
          Reclamar otro escrow
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Reclamar fondos de escrow</h3>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="ID del Escrow"
              placeholder="ej. 42"
              value={escrowIdInput}
              onChange={(e) => { setEscrowIdInput(e.target.value); reset() }}
              disabled={busy}
            />
          </div>
          <Button
            onClick={handleCheck}
            disabled={escrowIdParsed === null || busy}
            loading={step === 'checking'}
            variant="secondary"
            size="sm"
          >
            Verificar
          </Button>
        </div>

        {conditionStatus !== 'unknown' && (
          <div
            className="flex items-center gap-2 rounded-lg border border-[var(--border-dark)] bg-[var(--background)] px-3 py-2"
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: CONDITION_LABEL[conditionStatus].color }}
            />
            <p className="text-sm" style={{ color: CONDITION_LABEL[conditionStatus].color }}>
              {CONDITION_LABEL[conditionStatus].label}
            </p>
          </div>
        )}

        {conditionStatus === 'pending_request' && (
          <Button
            onClick={handleRequestVerification}
            loading={step === 'requesting'}
            disabled={busy}
          >
            Solicitar verificación de ingreso
          </Button>
        )}

        {conditionStatus === 'pending_publish' && (
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-[var(--border-dark)] bg-[var(--background)] p-3">
              <p className="text-xs text-[var(--text-muted)]">
                La solicitud fue enviada. Publica el resultado para que el escrow pueda verificarlo.
              </p>
            </div>
            <Button
              onClick={handlePublish}
              loading={step === 'publishing'}
              disabled={busy}
            >
              {step === 'publishing' ? 'Obteniendo firma CoFHE...' : 'Publicar resultado de verificación'}
            </Button>
          </div>
        )}

        {conditionStatus === 'met' && (
          <Button
            onClick={handleRedeem}
            loading={step === 'redeeming'}
            disabled={busy}
          >
            {step === 'redeeming' ? 'Procesando FHE...' : 'Redimir y recibir USDC'}
          </Button>
        )}

        {step !== 'idle' && step !== 'done' && (
          <TxStatus state={STEP_TO_TX[step]} errorMessage={error ?? undefined} />
        )}

        {step === 'idle' && error && (
          <TxStatus state="error" errorMessage={error} />
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-4">
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">¿Dónde encuentro mi Escrow ID?</p>
        <p className="text-xs text-[var(--text-muted)]">
          El prestamista recibe el Escrow ID al crear el escrow en su portafolio.
          Pídele que te lo comparta. El ID es un número entero (ej. 42).
        </p>
      </div>
    </div>
  )
}
