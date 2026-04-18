/**
 * Source of income verification
 * Maps 1:1 to on-chain enum IncomeSource in LendiProof.sol
 *
 * Solidity enum values:
 * - MANUAL = 0
 * - PRIVARA = 1
 * - BANK_LINK = 2
 * - PAYROLL = 3
 */
export enum IncomeSource {
  MANUAL = 'MANUAL',       // 0 - Manually recorded by worker
  PRIVARA = 'PRIVARA',     // 1 - Verified via Privara protocol (Phase 6)
  BANK_LINK = 'BANK_LINK', // 2 - Bank integration (future)
  PAYROLL = 'PAYROLL',     // 3 - Payroll provider (future)
}

export interface IncomeEventParams {
  id: string;
  workerId: string;
  txHash: string;
  source: IncomeSource;
  createdAt: Date;
}

export class IncomeEvent {
  readonly id: string;
  readonly workerId: string;
  readonly txHash: string;
  readonly source: IncomeSource;
  readonly createdAt: Date;

  constructor(params: IncomeEventParams) {
    this.id = params.id;
    this.workerId = params.workerId;
    this.txHash = params.txHash;
    this.source = params.source;
    this.createdAt = params.createdAt;
  }
}
