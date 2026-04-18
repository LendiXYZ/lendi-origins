import { useState } from 'react'
import { useWalletStore } from '@/stores/wallet-store'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { strings } from '@/i18n'

type Panel = 'closed' | 'login' | 'register'

export function WalletButton() {
  const address    = useWalletStore((s) => s.address)
  const connecting = useWalletStore((s) => s.connecting)
  const { login, register, logout } = useAuth()

  const [panel, setPanel]       = useState<Panel>('closed')
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  function reset() {
    setPanel('closed')
    setUsername('')
    setError(null)
  }

  function extractErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message
    if (e && typeof e === 'object') {
      const obj = e as Record<string, unknown>
      console.error('[WalletButton] non-Error thrown:', JSON.stringify(obj))
      const code = obj['code']
      const msg  = obj['message'] ?? obj['msg'] ?? obj['error']
      if (msg && typeof msg === 'string') return msg
      if (code !== undefined) return `Error ${code} — abre la consola para más detalle`
    }
    console.error('[WalletButton] unknown error:', e)
    return strings.errors.generic
  }

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await login()
      reset()
    } catch (e) {
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!username.trim()) {
      setError('Ingresa un nombre de usuario')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register(username.trim())
      reset()
    } catch (e) {
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // ── Connected state ──────────────────────────────────────────────────────
  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[var(--surface-raised)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]">
          {truncated}
        </span>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--status-error)] cursor-pointer"
          title="Desconectar"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    )
  }

  // ── Closed / entry state ─────────────────────────────────────────────────
  if (panel === 'closed') {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" loading={connecting} onClick={() => setPanel('login')}>
          {strings.auth.signIn}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setPanel('register')}>
          {strings.auth.createAccount}
        </Button>
      </div>
    )
  }

  // ── Login panel ──────────────────────────────────────────────────────────
  if (panel === 'login') {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" loading={loading} onClick={handleLogin}>
          {strings.auth.signIn}
        </Button>
        <button
          type="button"
          onClick={reset}
          disabled={loading}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ✕
        </button>
        {error && (
          <span className="text-xs text-[var(--status-error)]">{error}</span>
        )}
      </div>
    )
  }

  // ── Register panel ───────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
        placeholder={strings.auth.usernamePlaceholder}
        disabled={loading}
        className="h-8 rounded-lg border border-[var(--border-dark)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)]"
      />
      <Button size="sm" loading={loading} onClick={handleRegister}>
        Crear
      </Button>
      <button
        type="button"
        onClick={reset}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        ✕
      </button>
      {error && (
        <span className="text-xs text-[var(--status-error)]">{error}</span>
      )}
    </div>
  )
}
