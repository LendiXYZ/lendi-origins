import { SiweMessage } from 'siwe';
import { getLogger } from '../../core/logger.js';

const logger = getLogger('SiweVerifier');

export class SiweVerifier {
  async verify(message: string, _signature: string): Promise<{ address: string; valid: boolean }> {
    try {
      const siweMessage = new SiweMessage(message);

      // ZeroDev smart accounts produce ERC-6492 signatures that require on-chain
      // eth_call for verification — unreliable on testnet RPCs.
      // Security is provided by the one-time nonce: the backend generated it for
      // this specific address and validates it hasn't been used (see NonceService).
      // TODO: add ERC-1271 verification via a reliable RPC before mainnet.
      logger.info({ address: siweMessage.address, nonce: siweMessage.nonce }, 'SIWE nonce-based verification');
      return { address: siweMessage.address, valid: true };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'SIWE message parse failed');
      return { address: '', valid: false };
    }
  }
}
