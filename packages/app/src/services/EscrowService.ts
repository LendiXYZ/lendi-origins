import { httpClient } from '@/http-client/HttpClient';

export interface CreateEscrowRequest {
  counterparty?: string;
  deadline?: string;
  external_reference?: string;
  amount: number;
  type: string;
  currency: { type: string; code: string };
  metadata?: Record<string, unknown>;
}

export interface CreateEscrowClientEncryptResponse {
  public_id: string;
  contract_address: string;
  abi_function_signature: string;
  abi_parameters: { resolver: string; resolver_data: string };
  owner_address: string;
  amount: number;
  amount_smallest_unit: string;
}

export interface EscrowResponse {
  public_id: string;
  type: string;
  counterparty?: string;
  deadline?: string;
  external_reference?: string;
  amount: number;
  currency: { type: string; code: string };
  status: string;
  on_chain_id?: string;
  tx_hash?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface EscrowListResponse {
  items: EscrowResponse[];
  continuation_token?: string;
  has_more: boolean;
  limit: number;
}

export class EscrowService {
  static async createWithClientEncrypt(req: CreateEscrowRequest): Promise<CreateEscrowClientEncryptResponse> {
    const { data } = await httpClient.post<CreateEscrowClientEncryptResponse>('/v1/escrows', req, {
      headers: { 'X-Encryption-Mode': 'client' },
    });
    return data;
  }

  static async list(params?: { status?: string; limit?: number }): Promise<EscrowListResponse> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    const { data } = await httpClient.get<EscrowListResponse>(`/v1/escrows${query ? `?${query}` : ''}`);
    return data;
  }

  static async reportTransaction(
    txHash: string,
    entityId: string,
  ): Promise<{ entity_id: string; tx_hash: string; status: string }> {
    const { data } = await httpClient.post<{ entity_id: string; tx_hash: string; status: string }>(
      '/v1/transactions/escrows/report',
      { tx_hash: txHash, entity_id: entityId },
    );
    return data;
  }
}
