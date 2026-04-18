import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { AppLayout } from '@/components/layout/app-layout'
import { RootLayout } from '@/routes/__root'
import { RolePickerPage } from '@/routes/index'
import { WorkerDashboardPage } from '@/routes/worker/index'
import { WorkerIncomePage } from '@/routes/worker/income'
import { WorkerApplyPage } from '@/routes/worker/apply'
import { WorkerAdvisorPage } from '@/routes/worker/advisor'
import { LenderDashboardPage } from '@/routes/lender/index'
import { LenderVerifyPage } from '@/routes/lender/verify'
import { LenderPortfolioPage } from '@/routes/lender/portfolio'

// ─── Root ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout })

// ─── Index (role picker / wallet connect) ────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RolePickerPage,
})

// ─── Auth guard ──────────────────────────────────────────────────────────────

function requireAuth() {
  if (!useAuthStore.getState().isAuthorized()) {
    throw redirect({ to: '/' })
  }
}

// ─── Worker layout (pathless, auth-guarded) ───────────────────────────────────

function WorkerLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

const workerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'worker-layout',
  beforeLoad: requireAuth,
  component: WorkerLayout,
})

const workerIndexRoute = createRoute({
  getParentRoute: () => workerLayoutRoute,
  path: '/worker',
  component: WorkerDashboardPage,
})

const workerIncomeRoute = createRoute({
  getParentRoute: () => workerLayoutRoute,
  path: '/worker/income',
  component: WorkerIncomePage,
})

const workerApplyRoute = createRoute({
  getParentRoute: () => workerLayoutRoute,
  path: '/worker/apply',
  component: WorkerApplyPage,
})

const workerAdvisorRoute = createRoute({
  getParentRoute: () => workerLayoutRoute,
  path: '/worker/advisor',
  component: WorkerAdvisorPage,
})

// ─── Lender layout (pathless, auth-guarded) ───────────────────────────────────

function LenderLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

const lenderLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'lender-layout',
  beforeLoad: requireAuth,
  component: LenderLayout,
})

const lenderIndexRoute = createRoute({
  getParentRoute: () => lenderLayoutRoute,
  path: '/lender',
  component: LenderDashboardPage,
})

const lenderVerifyRoute = createRoute({
  getParentRoute: () => lenderLayoutRoute,
  path: '/lender/verify',
  component: LenderVerifyPage,
})

const lenderPortfolioRoute = createRoute({
  getParentRoute: () => lenderLayoutRoute,
  path: '/lender/portfolio',
  component: LenderPortfolioPage,
})

// ─── Tree ────────────────────────────────────────────────────────────────────

const workerTree = workerLayoutRoute.addChildren([
  workerIndexRoute,
  workerIncomeRoute,
  workerApplyRoute,
  workerAdvisorRoute,
])

const lenderTree = lenderLayoutRoute.addChildren([
  lenderIndexRoute,
  lenderVerifyRoute,
  lenderPortfolioRoute,
])

export const routeTree = rootRoute.addChildren([
  indexRoute,
  workerTree,
  lenderTree,
])
