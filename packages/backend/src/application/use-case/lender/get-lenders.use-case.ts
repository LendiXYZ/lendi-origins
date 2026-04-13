import type { ILenderRepository } from '../../../domain/lender/repository/lender.repository.js';
import { toLenderResponse, type LenderResponse } from '../../dto/lender/lender-response.dto.js';

export class GetLendersUseCase {
  constructor(private readonly lenderRepository: ILenderRepository) {}

  async execute(): Promise<LenderResponse[]> {
    const lenders = await this.lenderRepository.findAll();
    return lenders.map(toLenderResponse);
  }
}
