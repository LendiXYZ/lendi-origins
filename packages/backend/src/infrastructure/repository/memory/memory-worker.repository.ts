import type { IWorkerRepository } from '../../../domain/worker/repository/worker.repository.js';
import type { Worker } from '../../../domain/worker/model/worker.js';

export class MemoryWorkerRepository implements IWorkerRepository {
  private readonly store = new Map<string, Worker>();

  async findById(id: string): Promise<Worker | null> {
    return this.store.get(id) ?? null;
  }

  async findByWalletAddress(walletAddress: string): Promise<Worker | null> {
    for (const worker of this.store.values()) {
      if (worker.walletAddress === walletAddress) return worker;
    }
    return null;
  }

  async findAll(): Promise<Worker[]> {
    return [...this.store.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(worker: Worker): Promise<void> {
    this.store.set(worker.id, worker);
  }

  async update(worker: Worker): Promise<void> {
    this.store.set(worker.id, worker);
  }
}
