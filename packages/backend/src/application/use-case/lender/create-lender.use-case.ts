import { randomUUID } from 'crypto';
import type { ILenderRepository } from '../../../domain/lender/repository/lender.repository.js';
import { Lender } from '../../../domain/lender/model/lender.js';
import { LenderStatus } from '../../../domain/lender/model/lender-status.enum.js';
import type { CreateLenderDto } from '../../dto/lender/create-lender.dto.js';
import { toLenderResponse, type LenderResponse } from '../../dto/lender/lender-response.dto.js';

export class CreateLenderUseCase {
  constructor(private readonly lenderRepository: ILenderRepository) {}

  async execute(dto: CreateLenderDto): Promise<LenderResponse> {
    const now = new Date();
    const lender = new Lender({
      id: randomUUID(),
      walletAddress: dto.wallet_address,
      status: LenderStatus.PENDING,
      feePaid: false,
      onChainRegistered: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.lenderRepository.save(lender);
    return toLenderResponse(lender);
  }
}
