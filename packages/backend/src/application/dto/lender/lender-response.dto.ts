import type { Lender } from '../../../domain/lender/model/lender.js';

export interface LenderResponse {
  id: string;
  wallet_address: string;
  status: string;
  fee_paid: boolean;
  on_chain_registered: boolean;
  created_at: string;
  updated_at: string;
}

export function toLenderResponse(lender: Lender): LenderResponse {
  return {
    id: lender.id,
    wallet_address: lender.walletAddress,
    status: lender.status,
    fee_paid: lender.feePaid,
    on_chain_registered: lender.onChainRegistered,
    created_at: lender.createdAt.toISOString(),
    updated_at: lender.updatedAt.toISOString(),
  };
}
