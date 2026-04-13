import type { IIncomeEventRepository } from '../../../domain/income-event/repository/income-event.repository.js';
import { toIncomeEventResponse, type IncomeEventResponse } from '../../dto/income-event/income-event-response.dto.js';

export class GetIncomeEventsUseCase {
  constructor(private readonly incomeEventRepository: IIncomeEventRepository) {}

  async execute(workerId: string): Promise<IncomeEventResponse[]> {
    const events = await this.incomeEventRepository.findByWorkerId(workerId);
    return events.map(toIncomeEventResponse);
  }
}
