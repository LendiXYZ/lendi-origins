import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useAuth } from '@/hooks/use-auth'
import { strings } from '@/i18n'

const workerLinks = [
  { name: strings.nav.worker.panel,   to: '/worker' },
  { name: strings.nav.worker.income,  to: '/worker/income' },
  { name: strings.nav.worker.apply,   to: '/worker/apply' },
  { name: strings.nav.worker.advisor, to: '/worker/advisor' },
] as const

const lenderLinks = [
  { name: strings.nav.lender.panel,     to: '/lender' },
  { name: strings.nav.lender.verify,    to: '/lender/verify' },
  { name: strings.nav.lender.portfolio, to: '/lender/portfolio' },
] as const

export function AppNavbar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const walletAddress = useAuthStore((s) => s.walletAddress)
  const { logout } = useAuth()

  const isWorker = location.pathname.startsWith('/worker')
  const isLender = location.pathname.startsWith('/lender')
  const navLinks = isWorker ? workerLinks : isLender ? lenderLinks : []

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : ''

  function isActive(path: string) {
    return location.pathname === path
  }

  async function handleLogout() {
    await logout()
    navigate({ to: '/' })
  }

  return (
    <nav className="border-b border-[var(--border-dark)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-[var(--text-primary)]">
            Lendi
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={[
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.to)
                    ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: role switch + address + logout */}
        <div className="flex items-center gap-2">
          {isWorker && (
            <Link
              to="/lender"
              className="hidden rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              {strings.nav.switchToLender}
            </Link>
          )}
          {isLender && (
            <Link
              to="/worker"
              className="hidden rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              {strings.nav.switchToWorker}
            </Link>
          )}
          {walletAddress && (
            <span className="hidden rounded-lg bg-[var(--background-secondary)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)] sm:block">
              {truncatedAddress}
            </span>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--status-error)] cursor-pointer"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}
