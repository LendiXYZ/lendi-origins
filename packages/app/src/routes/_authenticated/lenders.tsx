import { useEffect, useState } from 'react';
import { useLenderStore } from '@/stores/lender-store';
import { LenderList } from '@/components/features/lender-list';
import { LenderForm } from '@/components/features/lender-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function LendersPage() {
  const lenders = useLenderStore((s) => s.lenders);
  const loading = useLenderStore((s) => s.loading);
  const fetchLenders = useLenderStore((s) => s.fetchLenders);
  const createLender = useLenderStore((s) => s.createLender);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  async function handleCreate(walletAddress: string) {
    await createLender(walletAddress);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Lenders</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Register Lender'}</Button>
      </div>

      {showForm && (
        <Card title="Register Lender">
          <LenderForm onSubmit={handleCreate} />
        </Card>
      )}

      <Card>
        <LenderList lenders={lenders} loading={loading} />
      </Card>
    </div>
  );
}
