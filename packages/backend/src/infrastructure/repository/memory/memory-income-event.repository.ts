import type { IIncomeEventRepository } from '../../../domain/income-event/repository/income-event.repository.js';
import type { IncomeEvent } from '../../../domain/income-event/model/income-event.js';

export class MemoryIncomeEventRepository implements IIncomeEventRepository {
  private readonly store = new Map<string, IncomeEvent>();

  async findById(id: string): Promise<IncomeEvent | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkerId(workerId: string): Promise<IncomeEvent[]> {
    return [...this.store.values()]
      .filter((e) => e.workerId === workerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(event: IncomeEvent): Promise<void> {
    this.store.set(event.id, event);
  }
}
