import { useState } from 'react'
import { useLendiProof } from '@/hooks/useLendiProof'
import { useFheStore } from '@/stores/fhe-store'
import { useWalletStore } from '@/stores/wallet-store'
import { ensureJwt } from '@/hooks/use-auth'
import { WorkerService } from '@/services/WorkerService'
import { IncomeEventService } from '@/services/IncomeEventService'
import { IncomeSource } from '@/types/income'
import { EncryptionStep } from '@/components/shared/EncryptionStep'
import { TxStatus } from '@/components/shared/TxStatus'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'
import type { TxState } from '@/components/shared/TxStatus'

interface IncomeCaptureProps {
  onRecorded?: () => void
}

export function IncomeCapture({ onRecorded }: IncomeCaptureProps) {
  const [amount, setAmount] = useState('')
  const [txState, setTxState] = useState<TxState>('idle')
  const [inputError, setInputError] = useState<string | null>(null)

  const { recordIncome, txError } = useLendiProof()
  const encStep = useFheStore((s) => s.encryptionStep)
  const encHandle = useFheStore((s) => s.lastEncryptedHandle)
  const resetEnc = useFheStore((s) => s.resetEncryption)

  const parsed = parseFloat(amount)
  const isValidAmount = !isNaN(parsed) && parsed > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidAmount) {
      setInputError('Ingresa un monto válido mayor a 0')
      return
    }
    setInputError(null)
    setTxState('encrypting')
    try {
      const txHash = await recordIncome(parsed, IncomeSource.MANUAL)
      setTxState('done')

      // Sync to backend (JWT prompt happens here, after UserOp is already confirmed)
      try {
        await ensureJwt()
        const address = useWalletStore.getState().address!
        const worker = await WorkerService.getOrCreate(address)
        await IncomeEventService.create(worker.id, txHash, IncomeSource.MANUAL)
      } catch {
        // Backend sync failure doesn't block the UX — tx is already on-chain
      }

      setAmount('')
      setTimeout(() => {
        setTxState('idle')
        resetEnc()
        onRecorded?.()
      }, 2500)
    } catch {
      setTxState('error')
    }
  }

  const busy = txState === 'encrypting' || txState === 'submitting' || txState === 'processing'

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5">
      <h3 className="mb-4 font-semibold text-[var(--text-primary)]">
        {strings.worker.income.capture}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={strings.worker.income.amountLabel}
          type="number"
          min="0.01"
          step="0.01"
          placeholder={strings.worker.income.amountPlaceholder}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setInputError(null) }}
          disabled={busy}
          error={inputError ?? undefined}
        />

        {amount && isValidAmount && (
          <EncryptionStep
            plainValue={`$${parsed.toFixed(2)} USDC`}
            encryptedHandle={encHandle}
            step={encStep}
          />
        )}

        <Button type="submit" loading={busy} disabled={!isValidAmount || busy}>
          {strings.worker.income.capture}
        </Button>

        {txState !== 'idle' && (
          <TxStatus state={txState} errorMessage={txError ?? undefined} />
        )}
      </form>
    </div>
  )
}
