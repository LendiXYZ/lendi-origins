import type { WorkerResponse } from '@/services/WorkerService';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkerListProps {
  workers: WorkerResponse[];
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

export function WorkerList({ workers, loading }: WorkerListProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)] text-[var(--text-secondary)]">
              <th className="pb-3 pr-4 font-medium">Wallet</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">On-chain</th>
              <th className="pb-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-b border-[var(--border-dark)] last:border-0">
                <td className="py-3 pr-4 font-mono text-sm text-[var(--text-primary)]">
                  {truncateAddress(worker.wallet_address)}
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={statusVariant(worker.status)}>{worker.status}</Badge>
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{worker.on_chain_registered ? 'Yes' : 'No'}</td>
                <td className="py-3 text-[var(--text-secondary)]">{formatDate(worker.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && workers.length === 0 && (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && workers.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No workers registered yet</p>
      )}
    </div>
  );
}
