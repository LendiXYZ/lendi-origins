import type { Worker } from '../../../domain/worker/model/worker.js';

export interface WorkerResponse {
  id: string;
  wallet_address: string;
  status: string;
  on_chain_registered: boolean;
  created_at: string;
  updated_at: string;
}

export function toWorkerResponse(worker: Worker): WorkerResponse {
  return {
    id: worker.id,
    wallet_address: worker.walletAddress,
    status: worker.status,
    on_chain_registered: worker.onChainRegistered,
    created_at: worker.createdAt.toISOString(),
    updated_at: worker.updatedAt.toISOString(),
  };
}
