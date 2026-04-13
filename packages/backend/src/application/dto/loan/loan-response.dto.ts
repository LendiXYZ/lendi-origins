import type { Loan } from '../../../domain/loan/model/loan.js';

export interface LoanResponse {
  id: string;
  worker_id: string;
  lender_id: string;
  escrow_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function toLoanResponse(loan: Loan): LoanResponse {
  return {
    id: loan.id,
    worker_id: loan.workerId,
    lender_id: loan.lenderId,
    escrow_id: loan.escrowId,
    status: loan.status,
    created_at: loan.createdAt.toISOString(),
    updated_at: loan.updatedAt.toISOString(),
  };
}
