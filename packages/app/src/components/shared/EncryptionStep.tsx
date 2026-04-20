import { cn } from '@/lib/utils'
import { strings } from '@/i18n'
import type { TxState } from './TxStatus'

interface EncryptionStepProps {
  plainValue: string
  encryptedHandle: string | null
  step: TxState
  className?: string
}

function truncateHandle(handle: string): string {
  if (handle.length <= 14) return handle
  return `${handle.slice(0, 8)}...${handle.slice(-4)}`
}

export function EncryptionStep({ plainValue, encryptedHandle, step, className }: EncryptionStepProps) {
  const isIdle = step === 'idle'
  const isEncrypting = step === 'encrypting'
  const isDone = (step === 'done' || step === 'submitting' || step === 'processing') && !!encryptedHandle

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-500',
        isEncrypting
          ? 'border-[var(--color-encrypted-border)] bg-[var(--color-encrypted-dim)]'
          : 'border-[var(--border-dark)] bg-[var(--surface-raised)]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        {/* Plain value */}
        <span
          className={cn(
            'text-lg font-semibold transition-all duration-500',
            isIdle && 'text-[var(--text-primary)]',
            isEncrypting && 'text-[var(--text-muted)] line-through opacity-50',
            isDone && 'hidden',
          )}
        >
          {plainValue}
        </span>

        {/* Encrypting animation */}
        {isEncrypting && (
          <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-encrypted)' }}>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {strings.tx.encrypting}
          </span>
        )}

        {/* Encrypted handle */}
        {isDone && encryptedHandle && (
          <span className="encrypted-value text-sm">
            {truncateHandle(encryptedHandle)}
          </span>
        )}
      </div>

      {/* Arrow indicator */}
      {!isIdle && (
        <svg
          className="h-4 w-4 shrink-0"
          style={{ color: isDone ? 'var(--status-success)' : 'var(--color-encrypted)' }}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          {isDone ? (
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          )}
        </svg>
      )}
    </div>
  )
}
