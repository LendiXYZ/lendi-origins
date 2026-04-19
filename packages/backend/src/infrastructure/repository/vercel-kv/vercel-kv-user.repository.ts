import Redis from 'ioredis';
import type { IUserRepository } from '../../../domain/auth/repository/user.repository.js';
import { User } from '../../../domain/auth/model/user.js';

const redis = new Redis(process.env.KV_REDIS_URL || '');

export class VercelKvUserRepository implements IUserRepository {
  private getUserKey(id: string): string {
    return `user:${id}`;
  }

  private getWalletIndexKey(walletAddress: string): string {
    return `wallet_index:${walletAddress.toLowerCase()}`;
  }

  private getEmailIndexKey(email: string): string {
    return `email_index:${email.toLowerCase()}`;
  }

  private serializeUser(user: User): string {
    return JSON.stringify({
      id: user.id,
      walletAddress: user.walletAddress,
      walletProvider: user.walletProvider,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  }

  private deserializeUser(data: string): User {
    const parsed = JSON.parse(data);
    return new User({
      id: parsed.id,
      walletAddress: parsed.walletAddress,
      walletProvider: parsed.walletProvider,
      email: parsed.email || undefined,
      createdAt: new Date(parsed.createdAt),
    });
  }

  async findById(id: string): Promise<User | null> {
    const key = this.getUserKey(id);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return this.deserializeUser(data);
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const indexKey = this.getWalletIndexKey(walletAddress);
    const userId = await redis.get(indexKey);

    if (!userId) {
      return null;
    }

    return this.findById(userId);
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) {
      return null;
    }

    const indexKey = this.getEmailIndexKey(email);
    const userId = await redis.get(indexKey);

    if (!userId) {
      return null;
    }

    return this.findById(userId);
  }

  async save(user: User): Promise<void> {
    const userKey = this.getUserKey(user.id);
    const walletIndexKey = this.getWalletIndexKey(user.walletAddress);

    const serializedUser = this.serializeUser(user);

    // Users don't expire - they persist indefinitely
    await redis.set(userKey, serializedUser);

    // Create wallet address index for fast lookups
    await redis.set(walletIndexKey, user.id);

    // If user has email, create email index
    if (user.email) {
      const emailIndexKey = this.getEmailIndexKey(user.email);
      await redis.set(emailIndexKey, user.id);
    }
  }

  async update(user: User): Promise<void> {
    // Update is the same as save for Redis
    await this.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    if (!user) {
      return;
    }

    const userKey = this.getUserKey(id);
    const walletIndexKey = this.getWalletIndexKey(user.walletAddress);

    // Delete user data
    await redis.del(userKey);

    // Delete wallet index
    await redis.del(walletIndexKey);

    // Delete email index if exists
    if (user.email) {
      const emailIndexKey = this.getEmailIndexKey(user.email);
      await redis.del(emailIndexKey);
    }
  }
}
