import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { AppLayout } from '@/components/layout/app-layout';
import { WalletAuthPage } from '@/routes/index';
import { DashboardPage } from '@/routes/_authenticated/dashboard';
import { WorkersPage } from '@/routes/_authenticated/workers';
import { LendersPage } from '@/routes/_authenticated/lenders';
import { LoansPage } from '@/routes/_authenticated/loans';
import { ProfilePage } from '@/routes/_authenticated/profile';

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WalletAuthPage,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthorized()) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const workersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/workers',
  component: WorkersPage,
});

const lendersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/lenders',
  component: LendersPage,
});

const loansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/loans',
  component: LoansPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/profile',
  component: ProfilePage,
});

const authenticatedTree = authenticatedRoute.addChildren([
  dashboardRoute,
  workersRoute,
  lendersRoute,
  loansRoute,
  profileRoute,
]);

export const routeTree = rootRoute.addChildren([indexRoute, authenticatedTree]);
