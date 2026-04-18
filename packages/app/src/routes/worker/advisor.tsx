import { strings } from '@/i18n'

export function WorkerAdvisorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {strings.worker.advisor.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {strings.worker.advisor.subtitle}
        </p>
      </div>

      {/* Phase 8: useAIAdvisor + @mlc-ai/web-llm */}
      {/* Model: Llama-3.2-3B-Instruct-q4f32_1-MLC */}
      {/* Income passed in RAM only — zero server calls */}

      <div className="rounded-xl border border-[var(--border-dark)] bg-[var(--surface-raised)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          WebLLM Advisor — disponible en Fase 8
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {strings.worker.advisor.suggestions.map((s) => (
            <span
              key={s}
              className="rounded-full border border-[var(--border-dark)] px-3 py-1 text-xs text-[var(--text-muted)]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
