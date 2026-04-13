import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorkerFormProps {
  onSubmit: (walletAddress: string) => void;
}

export function WorkerForm({ onSubmit }: WorkerFormProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;
    setSubmitting(true);
    try {
      onSubmit(walletAddress);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        label="Wallet Address *"
        placeholder="0x..."
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!walletAddress}>
          Register Worker
        </Button>
      </div>
    </form>
  );
}
