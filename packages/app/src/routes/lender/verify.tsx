import { strings } from '@/i18n'

export function LenderVerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.lender.verify.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.lender.verify.subtitle}
        </p>
      </div>

      {/* Phase 5: VerifyIncome component */}
      {/* worker address + threshold → proveIncome() → CoFHE (10-30s) → unsealBool → ✅/❌ */}
      {/* Privacy: income amount NEVER shown in this view */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          VerifyIncome + TxStatus — disponible en Fase 5
        </p>
        <p className="mt-3 text-xs text-[var(--text-dim)] font-mono">
          {strings.lender.verify.privacyStatement}
        </p>
      </div>
    </div>
  )
}
