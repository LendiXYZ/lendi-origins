import { useState } from 'react'
import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding'
import { IncomeCapture } from '@/components/worker/IncomeCapture'
import { IncomeHistory } from '@/components/worker/IncomeHistory'
import { strings } from '@/i18n'

export function WorkerIncomePage() {
  const [historyKey, setHistoryKey] = useState(0)

  return (
    <WorkerOnboarding>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {strings.worker.income.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.privacy.noAmount}
          </p>
        </div>

        <IncomeCapture onRecorded={() => setHistoryKey((k) => k + 1)} />

        <IncomeHistory key={historyKey} />
      </div>
    </WorkerOnboarding>
  )
}
