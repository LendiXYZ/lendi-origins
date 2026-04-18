import { cn } from '@/lib/utils'
import { strings } from '@/i18n'

interface PrivacyNoteProps {
  variant?: 'inline' | 'block'
  text?: string
  className?: string
}

export function PrivacyNote({ variant = 'inline', text, className }: PrivacyNoteProps) {
  const message = text ?? strings.privacy.note

  if (variant === 'block') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-[var(--color-encrypted-border)] bg-[var(--color-encrypted-dim)] px-4 py-3',
          className,
        )}
      >
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--color-encrypted)' }}>
            {strings.privacy.encrypted}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{message}</span>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]', className)}
    >
      <LockIcon className="h-3 w-3" />
      {message}
    </span>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      style={{ color: 'var(--color-encrypted)' }}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
