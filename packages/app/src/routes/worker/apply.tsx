import { strings } from '@/i18n'

export function WorkerApplyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.worker.apply.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.worker.apply.subtitle}
        </p>
      </div>

      {/* Phase 7: LoanApply form + EscrowCreator + useLoanFlow */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          LoanApply + EscrowCreator — disponible en Fase 7
        </p>
      </div>
    </div>
  )
}
