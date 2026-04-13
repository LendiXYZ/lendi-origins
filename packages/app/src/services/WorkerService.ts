import { httpClient } from '@/http-client/HttpClient';

export interface WorkerResponse {
  id: string;
  wallet_address: string;
  status: string;
  on_chain_registered: boolean;
  created_at: string;
  updated_at: string;
}

export class WorkerService {
  static async create(walletAddress: string): Promise<WorkerResponse> {
    const { data } = await httpClient.post<WorkerResponse>('/v1/workers', { wallet_address: walletAddress });
    return data;
  }

  static async list(): Promise<WorkerResponse[]> {
    const { data } = await httpClient.get<WorkerResponse[]>('/v1/workers');
    return data;
  }

  static async getById(id: string): Promise<WorkerResponse> {
    const { data } = await httpClient.get<WorkerResponse>(`/v1/workers/${id}`);
    return data;
  }
}
