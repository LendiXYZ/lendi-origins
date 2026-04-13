import { randomUUID } from 'crypto';
import type { Address } from 'viem';
import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import { Loan } from '../../../domain/loan/model/loan.js';
import { LoanStatus } from '../../../domain/loan/model/loan-status.enum.js';
import type { CreateLoanDto } from '../../dto/loan/create-loan.dto.js';
import { toLoanResponse, type LoanResponse } from '../../dto/loan/loan-response.dto.js';
import {
  LendiProofClient,
  ReinieraSDKClient,
  LendiProofGateClient,
  FHEDecryptionService,
} from '../../../infrastructure/blockchain/index.js';
import type { Logger } from 'pino';
import { getLogger } from '../../../core/logger.js';

export class CreateLoanUseCase {
  private logger: Logger;
  private lendiProofClient: LendiProofClient;
  private reinieraClient: ReinieraSDKClient;
  private gateClient: LendiProofGateClient;
  private fheService: FHEDecryptionService;

  constructor(private readonly loanRepository: ILoanRepository) {
    this.logger = getLogger('CreateLoanUseCase');
    this.lendiProofClient = new LendiProofClient();
    this.reinieraClient = new ReinieraSDKClient();
    this.gateClient = new LendiProofGateClient();
    this.fheService = new FHEDecryptionService();
  }

  async execute(dto: CreateLoanDto): Promise<LoanResponse> {
    const now = new Date();

    this.logger.info(
      {
        workerId: dto.worker_id,
        lenderId: dto.lender_id,
        loanAmount: dto.loan_amount_usdc,
        threshold: dto.threshold_usdc,
      },
      'Creating loan with FHE verification',
    );

    // Step 1: Verify worker is registered on-chain
    const isRegistered = await this.lendiProofClient.isWorkerRegistered(
      dto.worker_address as Address,
    );
    if (!isRegistered) {
      throw new Error(`Worker ${dto.worker_address} is not registered on-chain`);
    }

    this.logger.debug({ worker: dto.worker_address }, 'Worker registration verified');

    // Step 2: Create escrow in ReinieraOS with LendiProofGate as condition resolver
    // This also triggers onConditionSet() atomically, which links the escrow to worker
    const escrowResult = await this.reinieraClient.createLoanEscrow({
      loanAmountUSDC: dto.loan_amount_usdc,
      beneficiary: dto.beneficiary as Address,
      worker: dto.worker_address as Address,
      thresholdUSDC: dto.threshold_usdc,
    });

    this.logger.info(
      {
        escrowId: escrowResult.escrowId.toString(),
        txHash: escrowResult.txHash,
      },
      'Escrow created successfully',
    );

    // Step 3: Request FHE income verification
    // This prepares the encrypted handle and calls FHE.allowPublic()
    const requestTxHash = await this.gateClient.requestVerification(escrowResult.escrowId);

    this.logger.info(
      {
        escrowId: escrowResult.escrowId.toString(),
        txHash: requestTxHash,
      },
      'FHE verification requested',
    );

    // Step 4: Trigger off-chain decryption + publish (async, non-blocking)
    // This will happen in background - we don't await it
    this.fheService
      .decryptAndPublish(escrowResult.escrowId)
      .then(() => {
        this.logger.info(
          { escrowId: escrowResult.escrowId.toString() },
          'FHE decryption and publish completed',
        );
      })
      .catch((error) => {
        this.logger.error(
          { error, escrowId: escrowResult.escrowId.toString() },
          'FHE decryption failed',
        );
      });

    // Step 5: Save loan to database with status VERIFICATION_PENDING
    const loan = new Loan({
      id: randomUUID(),
      workerId: dto.worker_id,
      lenderId: dto.lender_id,
      escrowId: escrowResult.escrowId.toString(),
      status: LoanStatus.VERIFICATION_PENDING,
      createdAt: now,
      updatedAt: now,
    });

    await this.loanRepository.save(loan);

    this.logger.info(
      {
        loanId: loan.id,
        escrowId: escrowResult.escrowId.toString(),
      },
      'Loan created and saved to database',
    );

    return toLoanResponse(loan);
  }
}
