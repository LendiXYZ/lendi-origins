import { randomUUID } from 'crypto';
import type { IIncomeEventRepository } from '../../../domain/income-event/repository/income-event.repository.js';
import { IncomeEvent } from '../../../domain/income-event/model/income-event.js';
import type { CreateIncomeEventDto } from '../../dto/income-event/create-income-event.dto.js';
import { toIncomeEventResponse, type IncomeEventResponse } from '../../dto/income-event/income-event-response.dto.js';

export class CreateIncomeEventUseCase {
  constructor(private readonly incomeEventRepository: IIncomeEventRepository) {}

  async execute(dto: CreateIncomeEventDto): Promise<IncomeEventResponse> {
    const event = new IncomeEvent({
      id: randomUUID(),
      workerId: dto.worker_id,
      txHash: dto.tx_hash,
      source: dto.source,
      createdAt: new Date(),
    });

    await this.incomeEventRepository.save(event);
    return toIncomeEventResponse(event);
  }
}
