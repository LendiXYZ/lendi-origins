import { useState, useEffect } from 'react'
import { useLendiProof } from '@/hooks/useLendiProof'
import { PrivacyNote } from '@/components/shared/PrivacyNote'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'

export function BalanceView() {
  const [revealed, setRevealed] = useState(false)
  const [income, setIncome] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { getMyMonthlyIncome, fheInitializing } = useLendiProof()

  // Clear RAM on unmount
  useEffect(() => {
    return () => { setIncome(null); setRevealed(false) }
  }, [])

  async function handleReveal() {
    setLoading(true)
    setError(null)
    try {
      const value = await getMyMonthlyIncome()
      setIncome(value)
      setRevealed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errors.generic)
    } finally {
      setLoading(false)
    }
  }

  function handleHide() {
    setIncome(null)
    setRevealed(false)
  }

  const formatted = income !== null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(income)
    : null

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">
          {strings.worker.income.title}
        </h3>
        <PrivacyNote variant="inline" text={strings.worker.income.privacyNote} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        {revealed && formatted ? (
          <span className="text-3xl font-bold text-[var(--text-primary)]">{formatted}</span>
        ) : (
          <span className="text-3xl font-bold tracking-widest text-[var(--text-muted)]">
            {strings.worker.balance.concealed}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 text-xs text-[var(--status-error)]">{error}</p>
      )}

      {!revealed ? (
        <Button
          variant="secondary"
          size="sm"
          loading={loading || fheInitializing}
          onClick={handleReveal}
          disabled={loading || fheInitializing}
        >
          {fheInitializing ? 'Iniciando FHE...' : strings.worker.income.view}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={handleHide}>
          {strings.worker.income.hide}
        </Button>
      )}
    </div>
  )
}
