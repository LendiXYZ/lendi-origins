import { httpClient } from '@/http-client/HttpClient'

export interface IncomeEvent {
  id: string
  worker_id: string
  tx_hash: string
  source: number
  created_at: string
}

export class IncomeEventService {
  static async create(workerId: string, txHash: string, source: number): Promise<IncomeEvent> {
    const SOURCE_MAP: Record<number, string> = {
      0: 'MANUAL',
      1: 'PRIVARA',
      2: 'BANK_LINK',
      3: 'PAYROLL',
    }
    const { data } = await httpClient.post<IncomeEvent>('/v1/income-events', {
      worker_id: workerId,
      tx_hash: txHash,
      source: SOURCE_MAP[source] ?? 'MANUAL',
    })
    return data
  }

  static async getByWorkerId(workerId: string): Promise<IncomeEvent[]> {
    const { data } = await httpClient.get<IncomeEvent[]>(
      `/v1/income-events?worker_id=${encodeURIComponent(workerId)}`,
    )
    return data
  }
}
