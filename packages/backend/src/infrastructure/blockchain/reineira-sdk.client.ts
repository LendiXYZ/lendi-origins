import { ReineiraSDK } from '@reineira-os/sdk';
import type { Logger } from 'pino';
import { getLogger } from '../../core/logger.js';
import { getEnv } from '../../core/config.js';
import type { Address } from 'viem';

/**
 * Parameters for creating a loan escrow with Lendi verification gate
 */
export interface CreateLoanEscrowParams {
  loanAmountUSDC: number;
  beneficiary: Address;
  worker: Address;
  thresholdUSDC: number;
}

/**
 * Result of escrow creation
 */
export interface EscrowCreationResult {
  escrowId: bigint;
  txHash: string;
}

export interface IReinieraSDKClient {
  createLoanEscrow(params: CreateLoanEscrowParams): Promise<EscrowCreationResult>;
}

/**
 * Wrapper for @reineira-os/sdk
 *
 * Provides Lendi-specific escrow creation with LendiProofGate as condition resolver.
 *
 * Key responsibilities:
 * 1. Initialize ReineiraSDK with network config
 * 2. Encode conditionData correctly (20 bytes address + 8 bytes uint64)
 * 3. Create escrow with LendiProofGate as resolver
 * 4. Gate.onConditionSet() is called automatically during escrow creation
 *
 * IMPORTANT: This client does NOT call linkEscrow() manually.
 * The gate handles linking via onConditionSet() hook.
 */
export class ReinieraSDKClient implements IReinieraSDKClient {
  private logger: Logger;
  private sdk: any;
  private initialized = false;

  constructor() {
    this.logger = getLogger('ReinieraSDKClient');
  }

  /**
   * Initialize ReineiraOS SDK
   * Should be called before any other method
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const env = getEnv();

    if (!env.SIGNER_PRIVATE_KEY) {
      throw new Error('SIGNER_PRIVATE_KEY required for ReinieraSDK');
    }

    this.logger.info('Initializing ReineiraOS SDK');

    this.sdk = ReineiraSDK.create({
      network: 'testnet',
      privateKey: env.SIGNER_PRIVATE_KEY,
      rpcUrl: env.RPC_URL,
      onFHEInit: (status) => this.logger.debug({ status }, 'FHE initialization'),
    });

    await this.sdk.initialize();

    this.logger.info('ReineiraOS SDK initialized successfully');
    this.initialized = true;
  }

  /**
   * Encode conditionData for LendiProofGate
   *
   * Format: 20 bytes (address worker) + 8 bytes (uint64 threshold)
   * Total: 28 bytes
   *
   * @param worker - Worker address to verify
   * @param thresholdUSDC - Minimum income threshold in USDC (6 decimals)
   * @returns Hex-encoded bytes (0x...)
   */
  private encodeConditionData(worker: Address, thresholdUSDC: number): `0x${string}` {
    // Convert worker address to bytes20 (remove 0x prefix, pad if needed)
    const workerBytes = worker.slice(2).padStart(40, '0');

    // Convert threshold to uint64 (8 bytes = 16 hex chars)
    // USDC has 6 decimals, so 1000 USDC = 1000_000000
    const thresholdWei = BigInt(thresholdUSDC * 1_000000);
    const thresholdHex = thresholdWei.toString(16).padStart(16, '0');

    // Concatenate: 20 bytes address + 8 bytes uint64
    const conditionData = `0x${workerBytes}${thresholdHex}` as `0x${string}`;

    this.logger.debug(
      {
        worker,
        thresholdUSDC,
        thresholdWei: thresholdWei.toString(),
        conditionData,
        length: (conditionData.length - 2) / 2, // Should be 28 bytes
      },
      'Encoded condition data',
    );

    return conditionData;
  }

  /**
   * Create a loan escrow with Lendi FHE income verification
   *
   * Flow:
   * 1. Encode conditionData (worker address + threshold)
   * 2. Create escrow via ReineiraOS SDK with LendiProofGate as resolver
   * 3. SDK encrypts loanAmount using FHE
   * 4. ConfidentialEscrow.create() calls gate.onConditionSet() automatically
   * 5. Gate calls lendiProof.linkEscrow() with decoded worker + threshold
   *
   * @param params - Loan parameters
   * @returns Escrow ID and transaction hash
   */
  async createLoanEscrow(params: CreateLoanEscrowParams): Promise<EscrowCreationResult> {
    try {
      await this.ensureInitialized();

      const env = getEnv();
      const { loanAmountUSDC, beneficiary, worker, thresholdUSDC } = params;

      if (!env.LENDI_PROOF_GATE_ADDRESS) {
        throw new Error('LENDI_PROOF_GATE_ADDRESS not configured');
      }

      this.logger.info(
        {
          loanAmountUSDC,
          beneficiary,
          worker,
          thresholdUSDC,
        },
        'Creating loan escrow with Lendi gate',
      );

      // Encode conditionData for gate
      const conditionData = this.encodeConditionData(worker, thresholdUSDC);

      // Create escrow using ReineiraOS SDK
      // SDK handles FHE encryption of amount client-side
      const escrow = await this.sdk.escrow.create({
        amount: this.sdk.usdc(loanAmountUSDC),
        owner: beneficiary,
        resolver: env.LENDI_PROOF_GATE_ADDRESS,
        resolverData: conditionData,
      });

      this.logger.info(
        {
          escrowId: escrow.id.toString(),
          txHash: escrow.createTx.hash,
        },
        'Loan escrow created successfully',
      );

      return {
        escrowId: escrow.id,
        txHash: escrow.createTx.hash,
      };
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to create loan escrow');
      throw error;
    }
  }
}

