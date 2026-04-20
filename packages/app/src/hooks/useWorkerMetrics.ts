import { useState, useEffect } from 'react';
import { useWalletStore } from '@/stores/wallet-store';
import { IncomeEventService } from '@/services/IncomeEventService';
import { WorkerService } from '@/services/WorkerService';

export interface WorkerMetrics {
  incomeRecordsCount: number;
  passesThreshold: boolean;
  daysActive: number;
  platform?: string;
}

/**
 * Hook to fetch worker metrics for AI Advisor
 * Returns aggregated data without revealing actual income amounts
 */
export function useWorkerMetrics() {
  const address = useWalletStore((s) => s.address);
  const [metrics, setMetrics] = useState<WorkerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [address]);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);

    try {
      // Get worker profile
      const worker = await WorkerService.getOrCreate(address!);

      // Get income events
      const incomeEvents = await IncomeEventService.getByWorker(worker.id);

      // Calculate days active (since first income record)
      let daysActive = 0;
      if (incomeEvents.length > 0) {
        const firstEvent = incomeEvents.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        const firstDate = new Date(firstEvent.createdAt);
        const now = new Date();
        daysActive = Math.max(1, Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      // For now, we'll use a simple heuristic for passesThreshold
      // In production, this should come from on-chain FHE verification
      // TODO: Call LendiProofGate to check if worker passes threshold
      const passesThreshold = incomeEvents.length >= 5;

      setMetrics({
        incomeRecordsCount: incomeEvents.length,
        passesThreshold,
        daysActive,
        platform: undefined, // Could be inferred from worker metadata
      });
    } catch (err) {
      console.error('[useWorkerMetrics] Error fetching metrics:', err);
      setError('No se pudieron cargar tus métricas');

      // Set default metrics on error
      setMetrics({
        incomeRecordsCount: 0,
        passesThreshold: false,
        daysActive: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return { metrics, loading, error, refetch: fetchMetrics };
}
