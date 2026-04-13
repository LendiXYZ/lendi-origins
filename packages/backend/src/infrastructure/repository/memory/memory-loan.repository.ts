import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import type { Loan } from '../../../domain/loan/model/loan.js';

export class MemoryLoanRepository implements ILoanRepository {
  private readonly store = new Map<string, Loan>();

  async findById(id: string): Promise<Loan | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkerId(workerId: string): Promise<Loan[]> {
    return [...this.store.values()]
      .filter((l) => l.workerId === workerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByLenderId(lenderId: string): Promise<Loan[]> {
    return [...this.store.values()]
      .filter((l) => l.lenderId === lenderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findAll(): Promise<Loan[]> {
    return [...this.store.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(loan: Loan): Promise<void> {
    this.store.set(loan.id, loan);
  }

  async update(loan: Loan): Promise<void> {
    this.store.set(loan.id, loan);
  }
}
