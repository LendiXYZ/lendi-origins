import { httpClient } from '@/http-client/HttpClient';

export interface LenderResponse {
  id: string;
  wallet_address: string;
  status: string;
  fee_paid: boolean;
  on_chain_registered: boolean;
  created_at: string;
  updated_at: string;
}

export class LenderService {
  static async create(walletAddress: string): Promise<LenderResponse> {
    const { data } = await httpClient.post<LenderResponse>('/v1/lenders', { wallet_address: walletAddress });
    return data;
  }

  static async list(): Promise<LenderResponse[]> {
    const { data } = await httpClient.get<LenderResponse[]>('/v1/lenders');
    return data;
  }

  static async getById(id: string): Promise<LenderResponse> {
    const { data } = await httpClient.get<LenderResponse>(`/v1/lenders/${id}`);
    return data;
  }
}
