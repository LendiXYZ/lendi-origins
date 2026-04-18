import { cn } from '@/lib/utils'
import { strings } from '@/i18n'

export type TxState = 'idle' | 'encrypting' | 'submitting' | 'processing' | 'done' | 'error'

interface StateConfig {
  message: string
  colorVar: string
  spin?: boolean
  icon?: 'check' | 'error'
}

const STATE_CONFIG: Record<TxState, StateConfig> = {
  idle:       { message: '',                       colorVar: '' },
  encrypting: { message: strings.tx.encrypting,   colorVar: 'var(--color-encrypted)', spin: true },
  submitting: { message: strings.tx.submitting,   colorVar: 'var(--status-info)',      spin: true },
  processing: { message: strings.tx.processing,   colorVar: 'var(--status-warning)',   spin: true },
  done:       { message: strings.tx.done,          colorVar: 'var(--status-success)',   icon: 'check' },
  error:      { message: strings.tx.error,         colorVar: 'var(--status-error)',     icon: 'error' },
}

interface TxStatusProps {
  state: TxState
  /** Override the error message (e.g. from the caught error). */
  errorMessage?: string
  className?: string
}

export function TxStatus({ state, errorMessage, className }: TxStatusProps) {
  if (state === 'idle') return null

  const cfg = STATE_CONFIG[state]

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {cfg.spin && (
        <svg
          className="h-4 w-4 shrink-0 animate-spin"
          style={{ color: cfg.colorVar }}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}

      {cfg.icon === 'check' && (
        <svg
          className="h-4 w-4 shrink-0"
          style={{ color: cfg.colorVar }}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}

      {cfg.icon === 'error' && (
        <svg
          className="h-4 w-4 shrink-0"
          style={{ color: cfg.colorVar }}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}

      <span style={{ color: cfg.colorVar }}>
        {state === 'error' && errorMessage ? errorMessage : cfg.message}
      </span>
    </div>
  )
}
