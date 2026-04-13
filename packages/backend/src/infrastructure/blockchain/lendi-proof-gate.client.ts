import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
} from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { Logger } from 'pino';
import { getLogger } from '../../core/logger.js';
import { getEnv } from '../../core/config.js';

const LENDI_PROOF_GATE_ABI = [
  {
    type: 'function',
    name: 'requestVerification',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'publishVerification',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'result', type: 'bool' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isConditionMet',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getEncryptedHandle',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'VerificationRequested',
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'worker', type: 'address' },
      { indexed: false, name: 'threshold', type: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'VerificationPublished',
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: false, name: 'result', type: 'bool' },
    ],
  },
  {
    type: 'error',
    name: 'EscrowNotLinked',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'NoVerificationRequested',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'VerificationNotReady',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
  },
] as const;

export interface ILendiProofGateClient {
  requestVerification(escrowId: bigint): Promise<Hash>;
  publishVerification(escrowId: bigint, result: boolean, signature: `0x${string}`): Promise<Hash>;
  isConditionMet(escrowId: bigint): Promise<boolean>;
  getEncryptedHandle(escrowId: bigint): Promise<`0x${string}`>;
}

/**
 * Client for LendiProofGate - implements 3-step FHE verification flow
 *
 * Flow:
 * 1. requestVerification() - stores encrypted handle, enables public decryption
 * 2. Off-chain: decryptForTx() via FHEDecryptionService
 * 3. publishVerification() - publish plaintext result with signature
 * 4. isConditionMet() - read published result (view)
 */
export class LendiProofGateClient implements ILendiProofGateClient {
  private publicClient;
  private walletClient;
  private logger: Logger;
  private contractAddress: Address;

  constructor() {
    const env = getEnv();
    this.logger = getLogger('LendiProofGateClient');

    if (!env.LENDI_PROOF_GATE_ADDRESS) {
      throw new Error('LENDI_PROOF_GATE_ADDRESS not configured');
    }

    this.contractAddress = env.LENDI_PROOF_GATE_ADDRESS as Address;

    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });

    if (!env.SIGNER_PRIVATE_KEY) {
      throw new Error('SIGNER_PRIVATE_KEY required for LendiProofGateClient write operations');
    }

    const account = privateKeyToAccount(env.SIGNER_PRIVATE_KEY as `0x${string}`);
    this.walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });
  }

  /**
   * Step 1: Request FHE income verification
   * Calls proveIncome(), stores encrypted result, enables public decryption
   */
  async requestVerification(escrowId: bigint): Promise<Hash> {
    try {
      this.logger.info({ escrowId: escrowId.toString() }, 'Requesting FHE verification');

      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_GATE_ABI,
        functionName: 'requestVerification',
        args: [escrowId],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.info(
        { escrowId: escrowId.toString(), txHash: hash },
        'Verification requested successfully',
      );

      return hash;
    } catch (error) {
      this.logger.error(
        { error, escrowId: escrowId.toString() },
        'Failed to request verification',
      );
      throw error;
    }
  }

  /**
   * Step 3: Publish decrypted verification result
   * Called after off-chain decryption with plaintext + signature
   */
  async publishVerification(
    escrowId: bigint,
    result: boolean,
    signature: `0x${string}`,
  ): Promise<Hash> {
    try {
      this.logger.info(
        { escrowId: escrowId.toString(), result },
        'Publishing verification result',
      );

      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_GATE_ABI,
        functionName: 'publishVerification',
        args: [escrowId, result, signature],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.info(
        { escrowId: escrowId.toString(), result, txHash: hash },
        'Verification published successfully',
      );

      return hash;
    } catch (error) {
      this.logger.error(
        { error, escrowId: escrowId.toString() },
        'Failed to publish verification',
      );
      throw error;
    }
  }

  /**
   * Step 4: Check if condition is met (view)
   * Called by ReinieraOS ConfidentialEscrow before releasing funds
   */
  async isConditionMet(escrowId: bigint): Promise<boolean> {
    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_GATE_ABI,
        functionName: 'isConditionMet',
        args: [escrowId],
      });

      this.logger.debug({ escrowId: escrowId.toString(), result }, 'Condition check result');
      return result;
    } catch (error) {
      this.logger.error({ error, escrowId: escrowId.toString() }, 'Failed to check condition');
      throw error;
    }
  }

  /**
   * Get encrypted FHE handle for off-chain decryption
   */
  async getEncryptedHandle(escrowId: bigint): Promise<`0x${string}`> {
    try {
      const handle = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: LENDI_PROOF_GATE_ABI,
        functionName: 'getEncryptedHandle',
        args: [escrowId],
      });

      this.logger.debug({ escrowId: escrowId.toString(), handle }, 'Retrieved encrypted handle');
      return handle;
    } catch (error) {
      this.logger.error({ error, escrowId: escrowId.toString() }, 'Failed to get encrypted handle');
      throw error;
    }
  }
}
