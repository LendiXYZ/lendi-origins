import { useEffect, useState } from 'react';
import { useWorkerStore } from '@/stores/worker-store';
import { WorkerList } from '@/components/features/worker-list';
import { WorkerForm } from '@/components/features/worker-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function WorkersPage() {
  const workers = useWorkerStore((s) => s.workers);
  const loading = useWorkerStore((s) => s.loading);
  const fetchWorkers = useWorkerStore((s) => s.fetchWorkers);
  const createWorker = useWorkerStore((s) => s.createWorker);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  async function handleCreate(walletAddress: string) {
    await createWorker(walletAddress);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workers</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Register Worker'}</Button>
      </div>

      {showForm && (
        <Card title="Register Worker">
          <WorkerForm onSubmit={handleCreate} />
        </Card>
      )}

      <Card>
        <WorkerList workers={workers} loading={loading} />
      </Card>
    </div>
  );
}
