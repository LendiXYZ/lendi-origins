import { createCofheClient, createCofheConfig } from '@cofhe/sdk/node';
import { chains } from '@cofhe/sdk/chains';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import type { Logger } from 'pino';
import { getLogger } from '../../core/logger.js';
import { getEnv } from '../../core/config.js';
import { LendiProofGateClient } from './lendi-proof-gate.client.js';

/**
 * FHE Decryption Service
 *
 * Handles Step 2 of the 3-step FHE verification flow:
 * 1. requestVerification() - done by LendiProofGateClient
 * 2. decryptAndPublish() - THIS SERVICE (off-chain decrypt + on-chain publish)
 * 3. isConditionMet() - done by LendiProofGateClient
 *
 * IMPORTANT: This service uses @cofhe/sdk for off-chain decryption.
 * The decrypted value never touches the blockchain - only the signature is published.
 */
export interface IFHEDecryptionService {
  decryptAndPublish(escrowId: bigint): Promise<void>;
}

export class FHEDecryptionService implements IFHEDecryptionService {
  private logger: Logger;
  private gateClient: LendiProofGateClient;
  private cofheClient: ReturnType<typeof createCofheClient> | null = null;

  constructor() {
    this.logger = getLogger('FHEDecryptionService');
    this.gateClient = new LendiProofGateClient();
  }

  /**
   * Initialize CoFHE SDK for off-chain decryption
   */
  private async ensureInitialized(): Promise<void> {
    if (this.cofheClient) return;

    const env = getEnv();

    this.logger.info('Initializing CoFHE SDK');

    // Create viem clients for CoFHE
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });

    const account = privateKeyToAccount(env.SIGNER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });

    // Create CoFHE configuration with supported chains
    // Using arbSepolia from @cofhe/sdk/chains
    const config = createCofheConfig({
      supportedChains: [chains.arbSepolia],
    });

    // Create CoFHE client
    this.cofheClient = createCofheClient(config);

    // Connect with clients
    await this.cofheClient.connect(publicClient, walletClient);

    this.logger.info('CoFHE SDK initialized and connected successfully');
  }

  /**
   * Decrypt FHE handle off-chain and publish result with signature
   *
   * Flow:
   * 1. Get encrypted handle from LendiProofGate
   * 2. Decrypt off-chain using @cofhe/sdk
   * 3. Publish plaintext result + signature to gate contract
   *
   * @param escrowId - Escrow identifier
   */
  async decryptAndPublish(escrowId: bigint): Promise<void> {
    try {
      await this.ensureInitialized();

      if (!this.cofheClient) {
        throw new Error('CoFHE client not initialized');
      }

      this.logger.info({ escrowId: escrowId.toString() }, 'Starting FHE decryption flow');

      // Step 1: Get encrypted handle from gate
      const handle = await this.gateClient.getEncryptedHandle(escrowId);
      this.logger.debug({ escrowId: escrowId.toString(), handle }, 'Retrieved FHE handle');

      // Step 2: Decrypt off-chain using CoFHE
      // This calls the FHE coprocessor to decrypt the ebool value
      // The coprocessor returns the decryptedValue (bigint) + a cryptographic signature
      this.logger.info({ escrowId: escrowId.toString() }, 'Requesting off-chain decryption');

      const decryptResult = await this.cofheClient
        .decryptForTx(handle)
        .withoutPermit()
        .execute();

      const { decryptedValue, signature } = decryptResult;

      // For ebool, decryptedValue is 0 or 1
      const boolResult = decryptedValue !== 0n;

      this.logger.info(
        { escrowId: escrowId.toString(), result: boolResult, raw: decryptedValue.toString() },
        'FHE decryption completed',
      );

      // Step 3: Publish result with signature
      // The signature proves that the decryption is authentic
      // CoFHE network validates the signature on-chain
      await this.gateClient.publishVerification(escrowId, boolResult, signature);

      this.logger.info(
        { escrowId: escrowId.toString() },
        'Verification result published successfully',
      );
    } catch (error) {
      this.logger.error(
        { error, escrowId: escrowId.toString() },
        'Failed to decrypt and publish FHE result',
      );
      throw error;
    }
  }
}
