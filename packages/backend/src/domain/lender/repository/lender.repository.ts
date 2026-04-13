import type { Lender } from '../model/lender.js';

export interface ILenderRepository {
  findById(id: string): Promise<Lender | null>;
  findByWalletAddress(walletAddress: string): Promise<Lender | null>;
  findAll(): Promise<Lender[]>;
  save(lender: Lender): Promise<void>;
  update(lender: Lender): Promise<void>;
}
