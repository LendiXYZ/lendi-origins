import { useEffect, useState, useCallback } from 'react'
import { encodeFunctionData } from 'viem'
import { EscrowService, type EscrowResponse } from '@/services/EscrowService'
import { ensureJwt } from '@/hooks/use-auth'
import { useWalletStore } from '@/stores/wallet-store'
import { CONTRACTS } from '@/config/contracts'
import { strings } from '@/i18n'

const PROOF_GATE_ABI = [{
  name: 'requestVerification', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [],
}] as const

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'var(--status-warning)',
  ON_CHAIN:  'var(--status-info)',
  SETTLED:   'var(--status-success)',
  CANCELLED: 'var(--status-error)',
}

import type { CreatedEscrowInfo } from './EscrowCreator'

interface PortfolioTableProps {
  refreshKey?: number
  optimisticEntry?: CreatedEscrowInfo
}

export function PortfolioTable({ refreshKey, optimisticEntry }: PortfolioTableProps) {
  const [escrows, setEscrows] = useState<EscrowResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestingVerif, setRequestingVerif] = useState<Record<string, boolean>>({})
  const [verifTxHash, setVerifTxHash] = useState<Record<string, string>>({})

  const requestVerification = useCallback(async (onChainId: string) => {
    setRequestingVerif((prev) => ({ ...prev, [onChainId]: true }))
    try {
      const data = encodeFunctionData({
        abi: PROOF_GATE_ABI,
        functionName: 'requestVerification',
        args: [BigInt(onChainId)],
      })
      const hash = await useWalletStore.getState().sendUserOperation([
        { to: CONTRACTS.lendiProofGate, data },
      ])
      setVerifTxHash((prev) => ({ ...prev, [onChainId]: hash }))
    } catch {
      // non-fatal — user can retry
    } finally {
      setRequestingVerif((prev) => ({ ...prev, [onChainId]: false }))
    }
  }, [])

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

  // optimistic entry is shown ahead of backend list if its ID isn't already in the fetched rows
  const optimisticRow: EscrowResponse | null =
    optimisticEntry && !escrows.some((e) => e.on_chain_id === optimisticEntry.escrowId)
      ? {
          public_id: `optimistic-${optimisticEntry.escrowId}`,
          type: 'loan',
          counterparty: optimisticEntry.workerAddress,
          amount: optimisticEntry.amount,
          currency: { type: 'crypto', code: 'USDC' },
          status: 'ON_CHAIN',
          on_chain_id: optimisticEntry.escrowId,
          tx_hash: optimisticEntry.txHash || undefined,
          created_at: new Date().toISOString(),
        }
      : null

  const displayRows = optimisticRow ? [optimisticRow, ...escrows] : escrows

  if (!loading && displayRows.length === 0) {
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
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Verificación</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((e) => (
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
                <td className="px-4 py-3">
                  {e.status === 'ON_CHAIN' && e.on_chain_id ? (
                    verifTxHash[e.on_chain_id] ? (
                      <a
                        href={`${CONTRACTS.explorer}/tx/${verifTxHash[e.on_chain_id]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--status-success)] hover:underline"
                      >
                        Solicitada ↗
                      </a>
                    ) : (
                      <button
                        onClick={() => requestVerification(e.on_chain_id!)}
                        disabled={requestingVerif[e.on_chain_id]}
                        className="text-xs text-[var(--accent-blue)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingVerif[e.on_chain_id] ? 'Enviando...' : 'Solicitar'}
                      </button>
                    )
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
