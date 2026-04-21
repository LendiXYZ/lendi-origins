import { httpClient } from '@/http-client/HttpClient';

export interface AdvisorRequest {
  workerAddress: string;
  incomeRecordsCount: number;
  passesThreshold: boolean;
  daysActive: number;
  platform?: string;
  question?: string;
}

export interface AdvisorResponse {
  status: 'ready' | 'almost' | 'not_ready';
  message: string;
  nextStep: string;
  creditScore: number;
  encouragement: string;
}

export class AdvisorService {
  /**
   * Get AI-powered credit advice for a worker
   */
  static async getAdvice(request: AdvisorRequest): Promise<AdvisorResponse> {
    const { data } = await httpClient.post<AdvisorResponse>('/v1/advisor', request);
    return data;
  }
}
