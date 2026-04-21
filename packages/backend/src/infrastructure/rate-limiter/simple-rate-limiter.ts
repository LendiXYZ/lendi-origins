/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class SimpleRateLimiter {
  private readonly limits = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a key is rate limited
   * @returns true if allowed, false if rate limited
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No entry yet, create one
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Window expired, reset
    if (now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Within window, check limit
    if (entry.count >= this.maxRequests) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() >= entry.resetAt) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetAt(key: string): number | null {
    const entry = this.limits.get(key);
    if (!entry || Date.now() >= entry.resetAt) {
      return null;
    }
    return entry.resetAt;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instance for advisor endpoint: 5 requests per hour per worker
export const advisorRateLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000);
