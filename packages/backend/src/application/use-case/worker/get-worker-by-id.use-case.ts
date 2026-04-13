import type { IWorkerRepository } from '../../../domain/worker/repository/worker.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toWorkerResponse, type WorkerResponse } from '../../dto/worker/worker-response.dto.js';

export class GetWorkerByIdUseCase {
  constructor(private readonly workerRepository: IWorkerRepository) {}

  async execute(id: string): Promise<WorkerResponse> {
    const worker = await this.workerRepository.findById(id);
    if (!worker) {
      throw ApplicationHttpError.notFound('Worker not found');
    }
    return toWorkerResponse(worker);
  }
}
