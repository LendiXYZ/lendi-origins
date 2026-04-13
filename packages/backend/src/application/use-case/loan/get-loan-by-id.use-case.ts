import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toLoanResponse, type LoanResponse } from '../../dto/loan/loan-response.dto.js';

export class GetLoanByIdUseCase {
  constructor(private readonly loanRepository: ILoanRepository) {}

  async execute(id: string): Promise<LoanResponse> {
    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw ApplicationHttpError.notFound('Loan not found');
    }
    return toLoanResponse(loan);
  }
}
