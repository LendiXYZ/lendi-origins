import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoanFormProps {
  onSubmit: (workerId: string, lenderId: string) => void;
}

export function LoanForm({ onSubmit }: LoanFormProps) {
  const [workerId, setWorkerId] = useState('');
  const [lenderId, setLenderId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workerId || !lenderId) return;
    setSubmitting(true);
    try {
      onSubmit(workerId, lenderId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Worker ID *"
          placeholder="Worker UUID"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
        />
        <Input
          label="Lender ID *"
          placeholder="Lender UUID"
          value={lenderId}
          onChange={(e) => setLenderId(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!workerId || !lenderId}>
          Create Loan
        </Button>
      </div>
    </form>
  );
}
