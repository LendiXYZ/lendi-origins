import { Redis } from '@upstash/redis';
import type { INonceRepository } from '../../../domain/nonce/repository/nonce.repository.js';

const redis = new Redis({
  url: process.env.KV_REDIS_URL || '',
  token: '', // Not needed for native Redis URL
});

export class VercelKvNonceRepository implements INonceRepository {
  async save(walletAddress: string, nonce: string, ttlSeconds: number): Promise<void> {
    const key = `nonce:${walletAddress}:${nonce}`;
    await redis.set(key, { nonce, walletAddress }, { ex: ttlSeconds });
  }

  async findAndDelete(walletAddress: string, nonce: string): Promise<boolean> {
    const key = `nonce:${walletAddress}:${nonce}`;
    const entry = await redis.get(key);

    if (!entry) {
      return false;
    }

    await redis.del(key);
    return true;
  }
}
