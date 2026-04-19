import Redis from 'ioredis';
import type { INonceRepository } from '../../../domain/nonce/repository/nonce.repository.js';

const redis = new Redis(process.env.KV_REDIS_URL || '');

export class VercelKvNonceRepository implements INonceRepository {
  async save(walletAddress: string, nonce: string, ttlSeconds: number): Promise<void> {
    const key = `nonce:${walletAddress}:${nonce}`;
    const value = JSON.stringify({ nonce, walletAddress });
    await redis.set(key, value, 'EX', ttlSeconds);
  }

  async findAndDelete(walletAddress: string, nonce: string): Promise<boolean> {
    const key = `nonce:${walletAddress}:${nonce}`;
    const value = await redis.get(key);

    if (!value) {
      return false;
    }

    await redis.del(key);
    return true;
  }
}
