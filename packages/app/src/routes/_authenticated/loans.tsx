import { useEffect, useState } from 'react';
import { useLoanStore } from '@/stores/loan-store';
import { LoanList } from '@/components/features/loan-list';
import { LoanForm } from '@/components/features/loan-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function LoansPage() {
  const loans = useLoanStore((s) => s.loans);
  const loading = useLoanStore((s) => s.loading);
  const fetchLoans = useLoanStore((s) => s.fetchLoans);
  const createLoan = useLoanStore((s) => s.createLoan);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  async function handleCreate(workerId: string, lenderId: string) {
    await createLoan(workerId, lenderId);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Loans</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New Loan'}</Button>
      </div>

      {showForm && (
        <Card title="Create Loan">
          <LoanForm onSubmit={handleCreate} />
        </Card>
      )}

      <Card>
        <LoanList loans={loans} loading={loading} />
      </Card>
    </div>
  );
}
