import { WorkerStatus } from './worker-status.enum.js';

export interface WorkerParams {
  id: string;
  walletAddress: string;
  status: WorkerStatus;
  onChainRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Worker {
  readonly id: string;
  readonly walletAddress: string;
  status: WorkerStatus;
  onChainRegistered: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: WorkerParams) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.status = params.status;
    this.onChainRegistered = params.onChainRegistered;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  markAsRegistered(): this {
    this.status = WorkerStatus.REGISTERED;
    this.onChainRegistered = true;
    this.updatedAt = new Date();
    return this;
  }

  markAsActive(): this {
    this.status = WorkerStatus.ACTIVE;
    this.updatedAt = new Date();
    return this;
  }

  markAsSuspended(): this {
    this.status = WorkerStatus.SUSPENDED;
    this.updatedAt = new Date();
    return this;
  }
}
