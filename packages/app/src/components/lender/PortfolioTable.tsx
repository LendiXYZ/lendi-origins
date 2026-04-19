import { useEffect, useState } from 'react'
import { EscrowService, type EscrowResponse } from '@/services/EscrowService'
import { ensureJwt } from '@/hooks/use-auth'
import { CONTRACTS } from '@/config/contracts'
import { strings } from '@/i18n'

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'var(--status-warning)',
  ON_CHAIN:  'var(--status-info)',
  SETTLED:   'var(--status-success)',
  CANCELLED: 'var(--status-error)',
}

interface PortfolioTableProps {
  refreshKey?: number
}

export function PortfolioTable({ refreshKey }: PortfolioTableProps) {
  const [escrows, setEscrows] = useState<EscrowResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        await ensureJwt()
        const res = await EscrowService.list({ limit: 20 })
        if (!cancelled) setEscrows(res.items)
      } catch (e) {
        if (!cancelled) setError(strings.errors.generic)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">Cargando portafolio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--status-error)]">{error}</p>
      </div>
    )
  }

  if (escrows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">{strings.lender.portfolio.empty}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Escrow ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Monto</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Worker</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Fecha</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Tx</th>
            </tr>
          </thead>
          <tbody>
            {escrows.map((e) => (
              <tr
                key={e.public_id}
                className="border-b border-[var(--border-dark)] last:border-0 hover:bg-[var(--background)] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                  {e.on_chain_id ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-primary)]">
                  {e.amount.toLocaleString('es-MX')} {e.currency.code}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                  {e.counterparty
                    ? `${e.counterparty.slice(0, 6)}…${e.counterparty.slice(-4)}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: `color-mix(in srgb, ${STATUS_COLORS[e.status] ?? 'var(--text-muted)'} 15%, transparent)`,
                      color: STATUS_COLORS[e.status] ?? 'var(--text-muted)',
                    }}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {new Date(e.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  {e.tx_hash ? (
                    <a
                      href={`${CONTRACTS.explorer}/tx/${e.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-blue)] hover:underline"
                    >
                      Ver ↗
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
