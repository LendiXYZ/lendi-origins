import { Link, useLocation } from '@tanstack/react-router'
import { WalletButton } from '@/components/shared/WalletButton'
import { strings } from '@/i18n'

const WORKER_LINKS = [
  { label: strings.nav.worker.panel,   to: '/worker'          },
  { label: strings.nav.worker.income,  to: '/worker/income'   },
  { label: strings.nav.worker.apply,   to: '/worker/apply'    },
  { label: strings.nav.worker.advisor, to: '/worker/advisor'  },
] as const

const LENDER_LINKS = [
  { label: strings.nav.lender.panel,     to: '/lender'           },
  { label: strings.nav.lender.verify,    to: '/lender/verify'    },
  { label: strings.nav.lender.portfolio, to: '/lender/portfolio' },
] as const

export function AppHeader() {
  const location = useLocation()
  const path     = location.pathname

  const isWorker = path.startsWith('/worker')
  const isLender = path.startsWith('/lender')
  const navLinks = isWorker ? WORKER_LINKS : isLender ? LENDER_LINKS : []

  function isActive(to: string) {
    return path === to
  }

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-[var(--border-dark)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left: logo + nav links */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--accent-blue)]"
          >
            Lendi
          </Link>

          {navLinks.length > 0 && (
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Navegación principal">
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
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right: role switcher + wallet */}
        <div className="flex items-center gap-3">
          {isWorker && (
            <Link
              to="/lender"
              className="hidden text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              {strings.nav.switchToLender}
            </Link>
          )}
          {isLender && (
            <Link
              to="/worker"
              className="hidden text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              {strings.nav.switchToWorker}
            </Link>
          )}

          <WalletButton />
        </div>

      </div>
    </header>
  )
}
