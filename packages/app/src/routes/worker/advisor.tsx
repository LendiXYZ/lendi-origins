import { AIAdvisor } from '@/components/worker/AIAdvisor'
import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding'
import { useWorkerMetrics } from '@/hooks/useWorkerMetrics'
import { useWalletStore } from '@/stores/wallet-store'
import { strings } from '@/i18n'

export function WorkerAdvisorPage() {
  const address = useWalletStore((s) => s.address)
  const { metrics, loading, error } = useWorkerMetrics()

  return (
    <WorkerOnboarding>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {strings.worker.advisor.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {strings.worker.advisor.subtitle}
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              <p className="text-[var(--text-secondary)]">Cargando tus datos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-red-400">{error}</p>
          </div>
        ) : metrics && address ? (
          <AIAdvisor
            workerAddress={address}
            incomeRecordsCount={metrics.incomeRecordsCount}
            passesThreshold={metrics.passesThreshold}
            daysActive={metrics.daysActive}
            platform={metrics.platform}
          />
        ) : null}
      </div>
    </WorkerOnboarding>
  )
}
