import { Link } from '@tanstack/react-router'
import { strings } from '@/i18n'

export function LenderDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.lender.dashboard.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.lender.dashboard.subtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/lender/verify"
          className="group rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
        >
          <p className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
            {strings.lender.verify.title}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.lender.verify.subtitle}
          </p>
        </Link>

        <Link
          to="/lender/portfolio"
          className="group rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
        >
          <p className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
            {strings.lender.portfolio.title}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.lender.portfolio.subtitle}
          </p>
        </Link>
      </div>
    </div>
  )
}
