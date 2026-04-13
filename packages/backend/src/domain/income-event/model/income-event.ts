export interface IncomeEventParams {
  id: string;
  workerId: string;
  txHash: string;
  source: string;
  createdAt: Date;
}

export class IncomeEvent {
  readonly id: string;
  readonly workerId: string;
  readonly txHash: string;
  readonly source: string;
  readonly createdAt: Date;

  constructor(params: IncomeEventParams) {
    this.id = params.id;
    this.workerId = params.workerId;
    this.txHash = params.txHash;
    this.source = params.source;
    this.createdAt = params.createdAt;
  }
}
