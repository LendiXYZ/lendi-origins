import type { IWorkerRepository } from '../../../domain/worker/repository/worker.repository.js';
import { toWorkerResponse, type WorkerResponse } from '../../dto/worker/worker-response.dto.js';

export class GetWorkersUseCase {
  constructor(private readonly workerRepository: IWorkerRepository) {}

  async execute(): Promise<WorkerResponse[]> {
    const workers = await this.workerRepository.findAll();
    return workers.map(toWorkerResponse);
  }
}
