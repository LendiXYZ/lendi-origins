import { strings } from '@/i18n'
import { LoanApply } from '@/components/worker/LoanApply'

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

      <LoanApply />
    </div>
  )
}
