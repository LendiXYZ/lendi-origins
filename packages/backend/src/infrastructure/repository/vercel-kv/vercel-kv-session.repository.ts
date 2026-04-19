import Redis from 'ioredis';
import type { ISessionRepository } from '../../../domain/auth/repository/session.repository.js';
import { Session } from '../../../domain/auth/model/session.js';

const redis = new Redis(process.env.KV_REDIS_URL || '');

export class VercelKvSessionRepository implements ISessionRepository {
  private getSessionKey(id: string): string {
    return `session:${id}`;
  }

  private getRefreshTokenKey(token: string): string {
    return `refresh_token:${token}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  private serializeSession(session: Session): string {
    return JSON.stringify({
      id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    });
  }

  private deserializeSession(data: string): Session {
    const parsed = JSON.parse(data);
    return new Session({
      id: parsed.id,
      userId: parsed.userId,
      refreshToken: parsed.refreshToken,
      expiresAt: new Date(parsed.expiresAt),
      createdAt: new Date(parsed.createdAt),
    });
  }

  async findById(id: string): Promise<Session | null> {
    const key = this.getSessionKey(id);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return this.deserializeSession(data);
  }

  async findByRefreshToken(token: string): Promise<Session | null> {
    const key = this.getRefreshTokenKey(token);
    const sessionId = await redis.get(key);

    if (!sessionId) {
      return null;
    }

    return this.findById(sessionId);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const key = this.getUserSessionsKey(userId);
    const sessionIds = await redis.smembers(key);

    if (sessionIds.length === 0) {
      return [];
    }

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.findById(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async save(session: Session): Promise<void> {
    const sessionKey = this.getSessionKey(session.id);
    const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
    const userSessionsKey = this.getUserSessionsKey(session.userId);

    const serializedSession = this.serializeSession(session);

    // Calculate TTL in seconds until session expires
    const ttlSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    if (ttlSeconds <= 0) {
      // Session already expired, don't save
      return;
    }

    // Save session data with expiration
    await redis.set(sessionKey, serializedSession, 'EX', ttlSeconds);

    // Map refresh token to session ID with same expiration
    await redis.set(refreshTokenKey, session.id, 'EX', ttlSeconds);

    // Add session ID to user's session set
    await redis.sadd(userSessionsKey, session.id);

    // Set expiration on user sessions set (slightly longer to allow cleanup)
    await redis.expire(userSessionsKey, ttlSeconds + 3600);
  }

  async delete(id: string): Promise<void> {
    const session = await this.findById(id);

    if (!session) {
      return;
    }

    const sessionKey = this.getSessionKey(id);
    const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
    const userSessionsKey = this.getUserSessionsKey(session.userId);

    // Delete session data
    await redis.del(sessionKey);

    // Delete refresh token mapping
    await redis.del(refreshTokenKey);

    // Remove session ID from user's session set
    await redis.srem(userSessionsKey, id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    const sessions = await this.findByUserId(userId);

    for (const session of sessions) {
      await this.delete(session.id);
    }

    // Clean up user sessions set
    const userSessionsKey = this.getUserSessionsKey(userId);
    await redis.del(userSessionsKey);
  }
}
