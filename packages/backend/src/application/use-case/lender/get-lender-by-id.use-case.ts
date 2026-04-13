import type { ILenderRepository } from '../../../domain/lender/repository/lender.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toLenderResponse, type LenderResponse } from '../../dto/lender/lender-response.dto.js';

export class GetLenderByIdUseCase {
  constructor(private readonly lenderRepository: ILenderRepository) {}

  async execute(id: string): Promise<LenderResponse> {
    const lender = await this.lenderRepository.findById(id);
    if (!lender) {
      throw ApplicationHttpError.notFound('Lender not found');
    }
    return toLenderResponse(lender);
  }
}
