import { Link } from '@tanstack/react-router'
import { WalletConnectButton } from '@/components/features/wallet-connect-button'
import { useAuthStore } from '@/stores/auth-store'
import { strings } from '@/i18n'

export function RolePickerPage() {
  const isAuthorized = useAuthStore((s) => s.isAuthorized())

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {strings.app.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{strings.app.tagline}</p>
        </div>

        {!isAuthorized ? (
          <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
            <WalletConnectButton />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/worker"
              className="group flex flex-col gap-3 rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
            >
              <span className="text-3xl">👷</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
                  {strings.roles.worker.label}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {strings.roles.worker.description}
                </p>
              </div>
            </Link>

            <Link
              to="/lender"
              className="group flex flex-col gap-3 rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6 transition-all hover:border-[var(--accent-blue)] hover:bg-[var(--blue-5)]"
            >
              <span className="text-3xl">🏦</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
                  {strings.roles.lender.label}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {strings.roles.lender.description}
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
