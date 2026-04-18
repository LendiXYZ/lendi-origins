import { strings } from '@/i18n'

export function LenderPortfolioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.lender.portfolio.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.lender.portfolio.subtitle}
        </p>
      </div>

      {/* Phase 7: PortfolioTable + EscrowCreator */}
      {/* escrowId: bigint (uint256) throughout */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          {strings.lender.portfolio.empty}
        </p>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          PortfolioTable + EscrowCreator — disponible en Fase 7
        </p>
      </div>
    </div>
  )
}
