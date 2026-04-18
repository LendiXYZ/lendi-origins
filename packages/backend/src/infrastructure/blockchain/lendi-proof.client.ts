import { createPublicClient, http, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { Logger } from 'pino';
import { getLogger } from '../../core/logger.js';
import { getEnv } from '../../core/config.js';

const LENDI_PROOF_ABI = [
  // Registration getters
  {
    type: 'function',
    name: 'registeredWorkers',
    stateMutability: 'view',
    inputs: [{ name: 'worker', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'registeredLenders',
    stateMutability: 'view',
    inputs: [{ name: 'lender', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  // Escrow metadata getters
  {
    type: 'function',
    name: 'escrowToWorker',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'escrowToThreshold',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'uint64' }],
  },
  // Wave 2: New getter functions for frontend
  {
    type: 'function',
    name: 'getMyMonthlyIncome',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }], // euint64 handle (ciphertext)
  },
  {
    type: 'function',
    name: 'getSealedMonthlyIncome',
    stateMutability: 'view',
    inputs: [{ name: 'worker', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }], // euint64 handle (ciphertext)
  },
  {
    type: 'function',
    name: 'getMyTxCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }], // euint64 handle (ciphertext)
  },
  // Wave 2: Updated event with source field
  {
    type: 'event',
    name: 'IncomeRecorded',
    inputs: [
      { name: 'worker', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'source', type: 'uint8', indexed: true }, // enum IncomeSource as uint8
    ],
  },
] as const;

export interface ILendiProofClient {
  isWorkerRegistered(address: Address): Promise<boolean>;
  isLenderRegistered(address: Address): Promise<boolean>;
  getEscrowWorker(escrowId: bigint): Promise<Address>;
  getEscrowThreshold(escrowId: bigint): Promise<bigint>;
}

/**
 * Client for interacting with LendiProof contract
 * Read-only operations for worker/lender registration and escrow metadata
 */
export class LendiProofClient implements ILendiProofClient {
  private publicClient;
  private logger: Logger;
  private contractAddress: Address;

  constructor() {
    const env = getEnv();
    this.logger = getLogger('LendiProofClient');

    if (!env.LENDI_PROOF_ADDRESS) {
      throw new Error('LENDI_PROOF_ADDRESS not configured');
    }

    this.contractAddress = env.LENDI_PROOF_ADDRESS as Address;

    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });
  }

  async isWorkerRegistered(address: Address): Promise<boolean> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_ABI,
        functionName: 'registeredWorkers',
        args: [address],
      });

      this.logger.debug({ address, result }, 'Checked worker registration');
      return result;
    } catch (error) {
      this.logger.error({ error, address }, 'Failed to check worker registration');
      throw error;
    }
  }

  async isLenderRegistered(address: Address): Promise<boolean> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_ABI,
        functionName: 'registeredLenders',
        args: [address],
      });

      this.logger.debug({ address, result }, 'Checked lender registration');
      return result;
    } catch (error) {
      this.logger.error({ error, address }, 'Failed to check lender registration');
      throw error;
    }
  }

  async getEscrowWorker(escrowId: bigint): Promise<Address> {
    try {
      const worker = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_ABI,
        functionName: 'escrowToWorker',
        args: [escrowId],
      });

      this.logger.debug({ escrowId: escrowId.toString(), worker }, 'Retrieved escrow worker');
      return worker;
    } catch (error) {
      this.logger.error({ error, escrowId: escrowId.toString() }, 'Failed to get escrow worker');
      throw error;
    }
  }

  async getEscrowThreshold(escrowId: bigint): Promise<bigint> {
    try {
      const threshold = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_ABI,
        functionName: 'escrowToThreshold',
        args: [escrowId],
      });

      this.logger.debug(
        { escrowId: escrowId.toString(), threshold: threshold.toString() },
        'Retrieved escrow threshold',
      );
      return threshold;
    } catch (error) {
      this.logger.error({ error, escrowId: escrowId.toString() }, 'Failed to get escrow threshold');
      throw error;
    }
  }
}
