import { LenderStatus } from './lender-status.enum.js';

export interface LenderParams {
  id: string;
  walletAddress: string;
  status: LenderStatus;
  feePaid: boolean;
  onChainRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Lender {
  readonly id: string;
  readonly walletAddress: string;
  status: LenderStatus;
  feePaid: boolean;
  onChainRegistered: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: LenderParams) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.status = params.status;
    this.feePaid = params.feePaid;
    this.onChainRegistered = params.onChainRegistered;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  markAsRegistered(): this {
    this.status = LenderStatus.REGISTERED;
    this.onChainRegistered = true;
    this.feePaid = true;
    this.updatedAt = new Date();
    return this;
  }

  markAsActive(): this {
    this.status = LenderStatus.ACTIVE;
    this.updatedAt = new Date();
    return this;
  }

  markAsSuspended(): this {
    this.status = LenderStatus.SUSPENDED;
    this.updatedAt = new Date();
    return this;
  }
}
