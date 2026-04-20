import { useState } from 'react'
import { strings } from '@/i18n'
import { EscrowCreator, type CreatedEscrowInfo } from '@/components/lender/EscrowCreator'
import { PortfolioTable } from '@/components/lender/PortfolioTable'

export function LenderPortfolioPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastCreated, setLastCreated] = useState<CreatedEscrowInfo | undefined>()

  function handleCreated(info: CreatedEscrowInfo) {
    setLastCreated(info)
    setRefreshKey((k) => k + 1)
  }

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

      <EscrowCreator onCreated={handleCreated} />

      <div>
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
          Escrows activos
        </h2>
        <PortfolioTable refreshKey={refreshKey} optimisticEntry={lastCreated} />
      </div>
    </div>
  )
}
