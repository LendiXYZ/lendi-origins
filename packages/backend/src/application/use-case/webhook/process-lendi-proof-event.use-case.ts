import type { ILoanRepository } from '../../../domain/loan/repository/loan.repository.js';
import type { IWorkerRepository } from '../../../domain/worker/repository/worker.repository.js';
import type { Logger } from 'pino';
import { getLogger } from '../../../core/logger.js';

export type LendiProofEventType = 'IncomeRecorded' | 'ProofRequested' | 'EscrowLinked';

export interface LendiProofEventPayload {
  tx_hash: string;
  event_type: LendiProofEventType;
  block_number: string;
  worker?: string; // Address
  amount?: string; // For IncomeRecorded (deprecated - not used)
  threshold?: string; // For IncomeRecorded (deprecated - not used)
  escrow_id?: string; // For EscrowLinked
  source?: number; // Wave 2: IncomeSource enum value (0=MANUAL, 1=PRIVARA, etc)
}

/**
 * Process LendiProof contract events from QuickNode webhooks
 *
 * Events:
 * - IncomeRecorded: Worker's income was recorded on-chain (encrypted)
 * - ProofRequested: Verification was requested for an escrow
 * - EscrowLinked: Escrow was linked to a worker
 */
export class ProcessLendiProofEventUseCase {
  private logger: Logger;

  constructor(
    private readonly loanRepository: ILoanRepository,
    private readonly workerRepository: IWorkerRepository,
  ) {
    this.logger = getLogger('ProcessLendiProofEventUseCase');
  }

  async execute(events: LendiProofEventPayload[]): Promise<void> {
    this.logger.info({ eventCount: events.length }, 'Processing LendiProof events');

    for (const event of events) {
      try {
        if (event.event_type === 'IncomeRecorded') {
          await this.handleIncomeRecorded(event);
        } else if (event.event_type === 'ProofRequested') {
          await this.handleProofRequested(event);
        } else if (event.event_type === 'EscrowLinked') {
          await this.handleEscrowLinked(event);
        }
      } catch (error) {
        this.logger.error(
          { error, event },
          'Failed to process LendiProof event',
        );
        // Continue processing other events even if one fails
      }
    }
  }

  /**
   * Handle IncomeRecorded event
   * Updates worker's last income record timestamp in DB
   * Wave 2: Now includes source field (0=MANUAL, 1=PRIVARA, etc)
   */
  private async handleIncomeRecorded(event: LendiProofEventPayload): Promise<void> {
    if (!event.worker) {
      this.logger.warn({ event }, 'IncomeRecorded event missing worker address');
      return;
    }

    this.logger.info(
      {
        worker: event.worker,
        txHash: event.tx_hash,
        blockNumber: event.block_number,
        source: event.source, // Wave 2: Log income source
      },
      'Processing IncomeRecorded event',
    );

    // Find worker in DB by wallet address
    const worker = await this.workerRepository.findByWalletAddress(event.worker);

    if (!worker) {
      this.logger.warn(
        { workerAddress: event.worker },
        'Worker not found in DB for IncomeRecorded event',
      );
      return;
    }

    // Update worker's last income record
    // Note: The actual encrypted income is stored on-chain, not in DB
    worker.updatedAt = new Date();
    await this.workerRepository.update(worker);

    this.logger.info(
      { workerId: worker.id, workerAddress: event.worker },
      'Updated worker after IncomeRecorded event',
    );
  }

  /**
   * Handle ProofRequested event
   * Marks the loan as 'verifying' status
   */
  private async handleProofRequested(event: LendiProofEventPayload): Promise<void> {
    if (!event.escrow_id) {
      this.logger.warn({ event }, 'ProofRequested event missing escrow_id');
      return;
    }

    this.logger.info(
      {
        escrowId: event.escrow_id,
        txHash: event.tx_hash,
        blockNumber: event.block_number,
      },
      'Processing ProofRequested event',
    );

    // Find loan by escrow ID
    const loan = await this.loanRepository.findByEscrowId(event.escrow_id);

    if (!loan) {
      this.logger.warn(
        { escrowId: event.escrow_id },
        'Loan not found for ProofRequested event',
      );
      return;
    }

    // Mark loan as verifying (FHE decryption in progress)
    loan.markAsVerificationPending();
    await this.loanRepository.update(loan);

    this.logger.info(
      { loanId: loan.id, escrowId: event.escrow_id },
      'Marked loan as verification pending',
    );
  }

  /**
   * Handle EscrowLinked event
   * Confirms the escrow-worker link was created on-chain
   */
  private async handleEscrowLinked(event: LendiProofEventPayload): Promise<void> {
    if (!event.escrow_id) {
      this.logger.warn({ event }, 'EscrowLinked event missing escrow_id');
      return;
    }

    this.logger.info(
      {
        escrowId: event.escrow_id,
        worker: event.worker,
        txHash: event.tx_hash,
        blockNumber: event.block_number,
      },
      'Processing EscrowLinked event',
    );

    // Find loan by escrow ID
    const loan = await this.loanRepository.findByEscrowId(event.escrow_id);

    if (!loan) {
      this.logger.warn(
        { escrowId: event.escrow_id },
        'Loan not found for EscrowLinked event',
      );
      return;
    }

    // Loan status is already set to VERIFICATION_PENDING in CreateLoanUseCase
    // This event just confirms the link was created successfully
    this.logger.info(
      { loanId: loan.id, escrowId: event.escrow_id },
      'Confirmed escrow-worker link on-chain',
    );
  }
}
