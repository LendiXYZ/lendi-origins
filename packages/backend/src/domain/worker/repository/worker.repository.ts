import type { Worker } from '../model/worker.js';

export interface IWorkerRepository {
  findById(id: string): Promise<Worker | null>;
  findByWalletAddress(walletAddress: string): Promise<Worker | null>;
  findAll(): Promise<Worker[]>;
  save(worker: Worker): Promise<void>;
  update(worker: Worker): Promise<void>;
}
