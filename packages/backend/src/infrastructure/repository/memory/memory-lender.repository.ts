import type { ILenderRepository } from '../../../domain/lender/repository/lender.repository.js';
import type { Lender } from '../../../domain/lender/model/lender.js';

export class MemoryLenderRepository implements ILenderRepository {
  private readonly store = new Map<string, Lender>();

  async findById(id: string): Promise<Lender | null> {
    return this.store.get(id) ?? null;
  }

  async findByWalletAddress(walletAddress: string): Promise<Lender | null> {
    for (const lender of this.store.values()) {
      if (lender.walletAddress === walletAddress) return lender;
    }
    return null;
  }

  async findAll(): Promise<Lender[]> {
    return [...this.store.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(lender: Lender): Promise<void> {
    this.store.set(lender.id, lender);
  }

  async update(lender: Lender): Promise<void> {
    this.store.set(lender.id, lender);
  }
}
