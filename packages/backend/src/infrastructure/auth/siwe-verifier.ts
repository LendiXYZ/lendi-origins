import { SiweMessage } from 'siwe';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { getEnv } from '../../core/config.js';
import { getLogger } from '../../core/logger.js';

const logger = getLogger('SiweVerifier');

// Fallback RPC for ERC-1271 smart account signature verification
const FALLBACK_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';

export class SiweVerifier {
  async verify(message: string, signature: string): Promise<{ address: string; valid: boolean }> {
    try {
      const siweMessage = new SiweMessage(message);
      const address = siweMessage.address as `0x${string}`;

      logger.info({ address, nonce: siweMessage.nonce }, 'Verifying SIWE signature');

      const configuredRpc = getEnv().RPC_URL;
      const rpcsToTry = [configuredRpc, FALLBACK_RPC].filter((r, i, arr) => arr.indexOf(r) === i);

      let lastError: unknown;
      for (const rpcUrl of rpcsToTry) {
        try {
          const publicClient = createPublicClient({
            chain: arbitrumSepolia,
            transport: http(rpcUrl, { timeout: 8_000 }),
          });

          const valid = await publicClient.verifyMessage({
            address,
            message,
            signature: signature as `0x${string}`,
          });

          logger.info({ address, valid, rpcUrl }, 'SIWE verification result');
          return { address: siweMessage.address, valid };
        } catch (err) {
          logger.warn({ rpcUrl, error: err instanceof Error ? err.message : err }, 'RPC failed, trying next');
          lastError = err;
        }
      }

      throw lastError;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'SIWE verification failed');
      return { address: '', valid: false };
    }
  }
}
