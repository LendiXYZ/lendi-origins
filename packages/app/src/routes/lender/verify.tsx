import { strings } from '@/i18n'
import { VerifyIncome } from '@/components/lender/VerifyIncome'

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

      <VerifyIncome />
    </div>
  )
}
