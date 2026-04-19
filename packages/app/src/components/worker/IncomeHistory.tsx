import { useEffect, useState } from 'react'
import { useWalletStore } from '@/stores/wallet-store'
import { WorkerService } from '@/services/WorkerService'
import { IncomeEventService, type IncomeEvent } from '@/services/IncomeEventService'
import { getSourceLabel, getSourceIcon } from '@/types/income'
import { strings } from '@/i18n'

export function IncomeHistory() {
  const address = useWalletStore((s) => s.address)
  const [events, setEvents] = useState<IncomeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const worker = await WorkerService.getByWallet(address!)
        if (!worker || cancelled) return
        const data = await IncomeEventService.getByWorkerId(worker.id)
        if (!cancelled) setEvents(data)
      } catch (e: unknown) {
        if (cancelled) return
        const status = (e as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          // No JWT yet — show empty state, user will authenticate on first action
          setLoading(false)
          return
        }
        setError(strings.errors.generic)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [address])

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5">
      <h3 className="mb-4 font-semibold text-[var(--text-primary)]">
        {strings.worker.income.historyTitle}
      </h3>

      {loading && (
        <p className="text-sm text-[var(--text-muted)]">Cargando historial...</p>
      )}

      {error && (
        <p className="text-sm text-[var(--status-error)]">{error}</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">{strings.worker.income.noHistory}</p>
      )}

      {!loading && events.length > 0 && (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border-dark)] bg-[var(--background)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>{getSourceIcon(event.source)}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {getSourceLabel(event.source)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(event.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <a
                href={`https://sepolia.arbiscan.io/tx/${event.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-blue)] hover:underline"
              >
                Ver tx ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
