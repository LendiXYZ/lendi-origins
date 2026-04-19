import { kv } from '@vercel/kv';
import type { INonceRepository } from '../../../domain/nonce/repository/nonce.repository.js';

export class VercelKvNonceRepository implements INonceRepository {
  async save(walletAddress: string, nonce: string, ttlSeconds: number): Promise<void> {
    const key = `nonce:${walletAddress}:${nonce}`;
    await kv.set(key, { nonce, walletAddress }, { ex: ttlSeconds });
  }

  async findAndDelete(walletAddress: string, nonce: string): Promise<boolean> {
    const key = `nonce:${walletAddress}:${nonce}`;
    const entry = await kv.get(key);

    if (!entry) {
      return false;
    }

    await kv.del(key);
    return true;
  }
}
