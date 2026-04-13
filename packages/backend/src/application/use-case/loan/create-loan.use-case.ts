import { randomUUID } from 'crypto';
import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import { Loan } from '../../../domain/loan/model/loan.js';
import { LoanStatus } from '../../../domain/loan/model/loan-status.enum.js';
import type { CreateLoanDto } from '../../dto/loan/create-loan.dto.js';
import { toLoanResponse, type LoanResponse } from '../../dto/loan/loan-response.dto.js';

export class CreateLoanUseCase {
  constructor(private readonly loanRepository: ILoanRepository) {}

  async execute(dto: CreateLoanDto): Promise<LoanResponse> {
    const now = new Date();
    const loan = new Loan({
      id: randomUUID(),
      workerId: dto.worker_id,
      lenderId: dto.lender_id,
      status: LoanStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    await this.loanRepository.save(loan);
    return toLoanResponse(loan);
  }
}
