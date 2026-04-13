import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import { toLoanResponse, type LoanResponse } from '../../dto/loan/loan-response.dto.js';

export class GetLoansUseCase {
  constructor(private readonly loanRepository: ILoanRepository) {}

  async execute(): Promise<LoanResponse[]> {
    const loans = await this.loanRepository.findAll();
    return loans.map(toLoanResponse);
  }
}
