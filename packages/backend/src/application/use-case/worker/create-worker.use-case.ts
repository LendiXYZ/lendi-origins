import { randomUUID } from 'crypto';
import type { IWorkerRepository } from '../../../domain/worker/repository/worker.repository.js';
import { Worker } from '../../../domain/worker/model/worker.js';
import { WorkerStatus } from '../../../domain/worker/model/worker-status.enum.js';
import type { CreateWorkerDto } from '../../dto/worker/create-worker.dto.js';
import { toWorkerResponse, type WorkerResponse } from '../../dto/worker/worker-response.dto.js';

export class CreateWorkerUseCase {
  constructor(private readonly workerRepository: IWorkerRepository) {}

  async execute(dto: CreateWorkerDto): Promise<WorkerResponse> {
    const now = new Date();
    const worker = new Worker({
      id: randomUUID(),
      walletAddress: dto.wallet_address,
      status: WorkerStatus.PENDING,
      onChainRegistered: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.workerRepository.save(worker);
    return toWorkerResponse(worker);
  }
}
