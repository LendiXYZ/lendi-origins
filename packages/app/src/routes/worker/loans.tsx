import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding'
import { LoanClaim } from '@/components/worker/LoanClaim'

export function WorkerLoansPage() {
  return (
    <WorkerOnboarding>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mis Préstamos</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Verifica la condición y recibe los fondos de tu escrow
          </p>
        </div>

        <LoanClaim />
      </div>
    </WorkerOnboarding>
  )
}
