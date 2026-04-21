import { useState, useEffect } from 'react';
import { AdvisorService, type AdvisorResponse } from '@/services/AdvisorService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLendiProof } from '@/hooks/useLendiProof';
import { useCofhe } from '@/hooks/useCofhe';

interface AIAdvisorProps {
  workerAddress: string;
  incomeRecordsCount: number;
  passesThreshold: boolean;
  daysActive: number;
  platform?: string;
}

export function AIAdvisor({
  workerAddress,
  incomeRecordsCount,
  passesThreshold,
  daysActive,
  platform,
}: AIAdvisorProps) {
  const [advice, setAdvice] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  // FHE decrypt state
  const [decryptedIncome, setDecryptedIncome] = useState<number | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  // FHE hooks
  const { getMyMonthlyIncome } = useLendiProof();
  const { unsealIncome } = useCofhe();

  // Fetch initial advice on mount or when income records change
  useEffect(() => {
    fetchAdvice();
  }, [incomeRecordsCount]);

  async function fetchAdvice(customQuestion?: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await AdvisorService.getAdvice({
        workerAddress,
        incomeRecordsCount,
        passesThreshold,
        daysActive,
        platform,
        question: customQuestion,
        // Pass decrypted income ephemerally if available
        monthlyIncomeUSDC: decryptedIncome ?? undefined,
      });
      setAdvice(response);
    } catch (err: any) {
      console.error('[AIAdvisor] Error fetching advice:', err);

      // Handle rate limit error
      if (err.response?.status === 429) {
        setError(err.response.data?.title || 'Has alcanzado el límite de consultas.');
      } else {
        setError('No pudimos obtener tu asesoría. Intenta de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
      setAsking(false);
    }
  }

  async function handleDecryptIncome() {
    setDecrypting(true);
    setError(null);

    try {
      console.log('[AIAdvisor] Starting income decryption...');

      // Step 1: Get encrypted handle from contract (Arbitrum Sepolia)
      const handle = await getMyMonthlyIncome();
      console.log('[AIAdvisor] Got encrypted handle:', handle);

      // Step 2: Decrypt in browser via CoFHE (10-30s)
      // Income NEVER leaves the device until passed ephemerally to advisor
      const plaintext = await unsealIncome(handle);
      console.log('[AIAdvisor] Income decrypted successfully');

      // Step 3: Store in local state only
      setDecryptedIncome(Number(plaintext));

      // Step 4: Refresh advice with real income
      await fetchAdvice();
    } catch (err: any) {
      console.error('[AIAdvisor] Decrypt failed:', err);
      setError('No pudimos descifrar tus ingresos. Intenta de nuevo más tarde.');
    } finally {
      setDecrypting(false);
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    await fetchAdvice(question.trim());
    setQuestion('');
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'from-green-600 to-green-700';
      case 'almost':
        return 'from-yellow-500 to-yellow-600';
      case 'not_ready':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Get status badge text
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Listo para préstamo';
      case 'almost':
        return 'Casi listo';
      case 'not_ready':
        return 'Construyendo historial';
      default:
        return 'Evaluando...';
    }
  };

  if (loading && !advice) {
    return (
      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-[var(--text-secondary)]">Analizando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (error && !advice) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!advice) return null;

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-sunken)] p-6 shadow-lg">
      {/* Header with credit score */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">
          Asesor de Crédito AI
        </h3>

        {/* Credit Score Circle */}
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90 transform">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-700"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - advice.creditScore / 100)}`}
              className={`text-${advice.status === 'ready' ? 'green' : advice.status === 'almost' ? 'yellow' : 'red'}-500 transition-all duration-1000`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--text-primary)]">
              {advice.creditScore}
            </span>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r ${getStatusColor(advice.status)} px-4 py-1 text-sm font-semibold text-white`}>
        {getStatusBadge(advice.status)}
      </div>

      {/* Main Message */}
      <div className="mb-5 rounded-lg bg-[var(--surface-sunken)] p-4">
        <p className="text-base leading-relaxed text-[var(--text-primary)]">
          {advice.message}
        </p>
      </div>

      {/* Next Step */}
      <div className="mb-5 rounded-lg border-l-4 border-[var(--accent)] bg-[var(--surface-raised)] p-4">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Próximo paso:
        </p>
        <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
          {advice.nextStep}
        </p>
      </div>

      {/* Encouragement */}
      <p className="mb-6 text-center text-sm italic text-[var(--text-secondary)]">
        {advice.encouragement}
      </p>

      {/* Decrypt Income Button */}
      {!decryptedIncome && (
        <div className="mb-4 border-t border-[var(--border-dark)] pt-4">
          <Button
            variant="primary"
            loading={decrypting}
            disabled={decrypting}
            onClick={handleDecryptIncome}
            className="w-full"
          >
            {decrypting
              ? '🔓 Descifrando... (puede tardar 30s)'
              : '🔒 Descifrar mis ingresos para mejor consejo'}
          </Button>
          <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
            Tus ingresos se descifran en tu navegador y nunca se almacenan
          </p>
        </div>
      )}

      {decryptedIncome && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <p className="text-center text-sm font-medium text-green-400">
            ✅ Ingresos verificados — consejo personalizado activado
          </p>
        </div>
      )}

      {/* Ask Question Form */}
      <form onSubmit={handleAskQuestion} className="flex flex-col gap-3 border-t border-[var(--border-dark)] pt-4">
        <Input
          label="¿Tienes alguna pregunta?"
          placeholder="Ej: ¿Cuántos registros más necesito?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking || loading}
          maxLength={500}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={asking || loading}
          disabled={!question.trim() || asking || loading}
        >
          Preguntar
        </Button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
