import type { LenderResponse } from '@/services/LenderService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface LenderListProps {
  lenders: LenderResponse[];
  loading: boolean;
}

function statusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    ACTIVE: 'success',
    REGISTERED: 'info',
    PENDING: 'warning',
    SUSPENDED: 'default',
  };
  return map[status] ?? 'default';
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LenderList({ lenders, loading }: LenderListProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)] text-[var(--text-secondary)]">
              <th className="pb-3 pr-4 font-medium">Wallet</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Fee Paid</th>
              <th className="pb-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {lenders.map((lender) => (
              <tr key={lender.id} className="border-b border-[var(--border-dark)] last:border-0">
                <td className="py-3 pr-4 font-mono text-sm text-[var(--text-primary)]">
                  {truncateAddress(lender.wallet_address)}
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={statusVariant(lender.status)}>{lender.status}</Badge>
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{lender.fee_paid ? 'Yes' : 'No'}</td>
                <td className="py-3 text-[var(--text-secondary)]">{formatDate(lender.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && lenders.length === 0 && (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && lenders.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No lenders registered yet</p>
      )}
    </div>
  );
}
