import type { Loan } from '../model/loan.js';

export interface ILoanRepository {
  findById(id: string): Promise<Loan | null>;
  findByWorkerId(workerId: string): Promise<Loan[]>;
  findByLenderId(lenderId: string): Promise<Loan[]>;
  findAll(): Promise<Loan[]>;
  save(loan: Loan): Promise<void>;
  update(loan: Loan): Promise<void>;
}
