import type { IIncomeEventRepository } from '../../../domain/income-event/repository/income-event.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toIncomeEventResponse, type IncomeEventResponse } from '../../dto/income-event/income-event-response.dto.js';

export class GetIncomeEventByIdUseCase {
  constructor(private readonly incomeEventRepository: IIncomeEventRepository) {}

  async execute(id: string): Promise<IncomeEventResponse> {
    const event = await this.incomeEventRepository.findById(id);
    if (!event) {
      throw ApplicationHttpError.notFound('Income event not found');
    }
    return toIncomeEventResponse(event);
  }
}
