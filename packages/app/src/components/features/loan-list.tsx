import type { LoanResponse } from '@/services/LoanService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface LoanListProps {
  loans: LoanResponse[];
  loading: boolean;
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    FUNDED: 'success',
    REPAID: 'success',
    QUALIFIED: 'info',
    ESCROW_CREATED: 'info',
    PENDING: 'warning',
    VERIFICATION_PENDING: 'warning',
    NOT_QUALIFIED: 'error',
    DEFAULTED: 'error',
    CANCELED: 'error',
  };
  return map[status] ?? 'default';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LoanList({ loans, loading }: LoanListProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)] text-[var(--text-secondary)]">
              <th className="pb-3 pr-4 font-medium">Loan ID</th>
              <th className="pb-3 pr-4 font-medium">Worker</th>
              <th className="pb-3 pr-4 font-medium">Lender</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-b border-[var(--border-dark)] last:border-0">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--text-primary)]">{loan.id.slice(0, 8)}...</td>
                <td className="py-3 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                  {loan.worker_id.slice(0, 8)}...
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                  {loan.lender_id.slice(0, 8)}...
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={statusVariant(loan.status)}>{loan.status}</Badge>
                </td>
                <td className="py-3 text-[var(--text-secondary)]">{formatDate(loan.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && loans.length === 0 && (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && loans.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No loans created yet</p>
      )}
    </div>
  );
}
