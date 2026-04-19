import { Link } from '@tanstack/react-router'
import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding'
import { BalanceView } from '@/components/worker/BalanceView'
import { PrivacyNote } from '@/components/shared/PrivacyNote'
import { strings } from '@/i18n'

export function WorkerDashboardPage() {
  return (
    <WorkerOnboarding>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {strings.worker.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.worker.dashboard.subtitle}
          </p>
        </div>

        <BalanceView />

        <PrivacyNote variant="block" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/worker/income"
            className="group flex flex-col gap-2 rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
          >
            <span className="text-2xl">💰</span>
            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)]">
              {strings.nav.worker.income}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Registra y cifra tu ingreso
            </p>
          </Link>

          <Link
            to="/worker/apply"
            className="group flex flex-col gap-2 rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
          >
            <span className="text-2xl">📋</span>
            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)]">
              {strings.nav.worker.apply}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {strings.worker.apply.subtitle}
            </p>
          </Link>

          <Link
            to="/worker/loans"
            className="group flex flex-col gap-2 rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
          >
            <span className="text-2xl">🏦</span>
            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)]">
              Mis Préstamos
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Verifica condición y recibe fondos
            </p>
          </Link>
        </div>
      </div>
    </WorkerOnboarding>
  )
}
