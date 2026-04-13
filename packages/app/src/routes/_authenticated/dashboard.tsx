import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useWorkerStore } from '@/stores/worker-store';
import { useLenderStore } from '@/stores/lender-store';
import { useLoanStore } from '@/stores/loan-store';
import { WorkerList } from '@/components/features/worker-list';
import { LenderList } from '@/components/features/lender-list';
import { LoanList } from '@/components/features/loan-list';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function DashboardPage() {
  const workers = useWorkerStore((s) => s.workers);
  const workerLoading = useWorkerStore((s) => s.loading);
  const fetchWorkers = useWorkerStore((s) => s.fetchWorkers);
  const lenders = useLenderStore((s) => s.lenders);
  const lenderLoading = useLenderStore((s) => s.loading);
  const fetchLenders = useLenderStore((s) => s.fetchLenders);
  const loans = useLoanStore((s) => s.loans);
  const loanLoading = useLoanStore((s) => s.loading);
  const fetchLoans = useLoanStore((s) => s.fetchLoans);

  useEffect(() => {
    fetchWorkers();
    fetchLenders();
    fetchLoans();
  }, [fetchWorkers, fetchLenders, fetchLoans]);

  const activeWorkers = workers.filter((w) => w.status === 'ACTIVE' || w.status === 'REGISTERED').length;
  const activeLenders = lenders.filter((l) => l.status === 'ACTIVE' || l.status === 'REGISTERED').length;
  const activeLoans = loans.filter((l) => l.status !== 'CANCELED' && l.status !== 'REPAID').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Lendi — Prove what you earn. Reveal nothing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Workers</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{workers.length}</p>
            </div>
            <Badge variant={activeWorkers > 0 ? 'success' : 'default'}>{activeWorkers} active</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Lenders</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{lenders.length}</p>
            </div>
            <Badge variant={activeLenders > 0 ? 'success' : 'default'}>{activeLenders} active</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Loans</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{loans.length}</p>
            </div>
            <Badge variant={activeLoans > 0 ? 'info' : 'default'}>{activeLoans} active</Badge>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent Workers">
          <WorkerList workers={workers.slice(0, 5)} loading={workerLoading} />
          {workers.length > 0 && (
            <div className="mt-4 border-t border-[var(--border-dark)] pt-4">
              <Link
                to="/workers"
                className="text-sm font-medium text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors"
              >
                View all workers
              </Link>
            </div>
          )}
        </Card>

        <Card title="Recent Lenders">
          <LenderList lenders={lenders.slice(0, 5)} loading={lenderLoading} />
          {lenders.length > 0 && (
            <div className="mt-4 border-t border-[var(--border-dark)] pt-4">
              <Link
                to="/lenders"
                className="text-sm font-medium text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors"
              >
                View all lenders
              </Link>
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent Loans">
        <LoanList loans={loans.slice(0, 5)} loading={loanLoading} />
        {loans.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-dark)] pt-4">
            <Link
              to="/loans"
              className="text-sm font-medium text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors"
            >
              View all loans
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
