import type { IncomeEvent } from '../model/income-event.js';

export interface IIncomeEventRepository {
  findById(id: string): Promise<IncomeEvent | null>;
  findByWorkerId(workerId: string): Promise<IncomeEvent[]>;
  save(event: IncomeEvent): Promise<void>;
}
