import { strings } from '@/i18n'

export function WorkerIncomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.worker.income.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.privacy.noAmount}
        </p>
      </div>

      {/* Phase 4: IncomeCapture (manual USDC entry → encrypt → recordIncome) */}
      {/* Phase 4: IncomeHistory (timestamps + source only, no amounts) */}
      {/* Phase 6: useReinieraIncome auto-capture from Privara */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          IncomeCapture + IncomeHistory — disponible en Fase 4
        </p>
      </div>
    </div>
  )
}
