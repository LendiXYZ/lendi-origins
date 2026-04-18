import { strings } from '@/i18n'

export function WorkerDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.worker.dashboard.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.worker.dashboard.subtitle}
        </p>
      </div>

      {/* Phase 2: WorkerOnboarding (registerWorker if not registered) */}
      {/* Phase 3: EncryptionStep + TxStatus */}
      {/* Phase 4: BalanceView + IncomeCapture + auto-capture status */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          WorkerOnboarding + BalanceView + IncomeCapture — disponible en Fase 4
        </p>
      </div>
    </div>
  )
}
