import type { IncomeEvent } from '../../../domain/income-event/model/income-event.js';

export interface IncomeEventResponse {
  id: string;
  worker_id: string;
  tx_hash: string;
  source: string;
  created_at: string;
}

export function toIncomeEventResponse(event: IncomeEvent): IncomeEventResponse {
  return {
    id: event.id,
    worker_id: event.workerId,
    tx_hash: event.txHash,
    source: event.source,
    created_at: event.createdAt.toISOString(),
  };
}
