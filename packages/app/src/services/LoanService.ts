import { httpClient } from '@/http-client/HttpClient';

export interface LoanResponse {
  id: string;
  worker_id: string;
  lender_id: string;
  escrow_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class LoanService {
  static async create(workerId: string, lenderId: string): Promise<LoanResponse> {
    const { data } = await httpClient.post<LoanResponse>('/v1/loans', { worker_id: workerId, lender_id: lenderId });
    return data;
  }

  static async list(): Promise<LoanResponse[]> {
    const { data } = await httpClient.get<LoanResponse[]>('/v1/loans');
    return data;
  }

  static async getById(id: string): Promise<LoanResponse> {
    const { data } = await httpClient.get<LoanResponse>(`/v1/loans/${id}`);
    return data;
  }
}
