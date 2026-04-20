import { useState, useEffect } from 'react'
import { useWalletStore } from '@/stores/wallet-store'
import { useLendiProof } from '@/hooks/useLendiProof'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'

export function LoanApply() {
  const address = useWalletStore((s) => s.address)
  const [copied, setCopied] = useState(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)

  const { isWorkerRegistered } = useLendiProof()

  useEffect(() => {
    isWorkerRegistered().then(setIsRegistered).catch(() => setIsRegistered(false))
  }, [isWorkerRegistered])

  function handleCopy() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: isRegistered ? 'var(--status-success)' : 'var(--status-warning)' }}
          />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isRegistered === null
              ? 'Verificando registro...'
              : isRegistered
                ? 'Registrado en el protocolo'
                : 'No registrado — completa el onboarding primero'}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs text-[var(--text-muted)]">Tu dirección de wallet</p>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-dark)] bg-[var(--background)] px-3 py-2">
            <span className="flex-1 truncate font-mono text-xs text-[var(--text-primary)]">
              {address ?? '—'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!address}>
              {copied ? 'Copiado ✓' : 'Copiar'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-dark)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
            ¿Cómo solicitar un préstamo?
          </p>
          <ol className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)] list-decimal list-inside">
            <li>Asegúrate de tener ingresos registrados en "Mi Ingreso"</li>
            <li>Comparte tu dirección con el prestamista</li>
            <li>El prestamista crea el escrow usando tu dirección y el monto</li>
            <li>El protocolo verifica tu ingreso automáticamente con FHE</li>
            <li>Si calificas, recibes los fondos sin revelar tu ingreso</li>
          </ol>
        </div>
      </div>

      <p className="text-center text-xs font-mono text-[var(--text-muted)]">
        {strings.privacy.noAmount}
      </p>
    </div>
  )
}
