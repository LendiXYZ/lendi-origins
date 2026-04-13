import { LoanStatus } from './loan-status.enum.js';

export interface LoanParams {
  id: string;
  workerId: string;
  lenderId: string;
  escrowId?: string;
  status: LoanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Loan {
  readonly id: string;
  readonly workerId: string;
  readonly lenderId: string;
  escrowId?: string;
  status: LoanStatus;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: LoanParams) {
    this.id = params.id;
    this.workerId = params.workerId;
    this.lenderId = params.lenderId;
    this.escrowId = params.escrowId;
    this.status = params.status;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  markAsEscrowCreated(escrowId: string): this {
    this.escrowId = escrowId;
    this.status = LoanStatus.ESCROW_CREATED;
    this.updatedAt = new Date();
    return this;
  }

  markAsVerificationPending(): this {
    this.status = LoanStatus.VERIFICATION_PENDING;
    this.updatedAt = new Date();
    return this;
  }

  markAsQualified(): this {
    this.status = LoanStatus.QUALIFIED;
    this.updatedAt = new Date();
    return this;
  }

  markAsNotQualified(): this {
    this.status = LoanStatus.NOT_QUALIFIED;
    this.updatedAt = new Date();
    return this;
  }

  markAsFunded(): this {
    this.status = LoanStatus.FUNDED;
    this.updatedAt = new Date();
    return this;
  }

  markAsRepaid(): this {
    this.status = LoanStatus.REPAID;
    this.updatedAt = new Date();
    return this;
  }

  markAsDefaulted(): this {
    this.status = LoanStatus.DEFAULTED;
    this.updatedAt = new Date();
    return this;
  }

  markAsCanceled(): this {
    this.status = LoanStatus.CANCELED;
    this.updatedAt = new Date();
    return this;
  }
}
