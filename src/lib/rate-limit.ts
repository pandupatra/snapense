interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  resetAt?: Date;
}

interface RequestLogEntry {
  timestamps: number[];
  lastCleanup: number;
}

// In-memory storage for request timestamps
const requestLogs = new Map<string, RequestLogEntry>();

const CLEANUP_INTERVAL = 300000; // 5 minutes in milliseconds
const MAX_LOG_ENTRIES = 10000;

/**
 * Sliding window rate limiter
 *
 * Tracks request timestamps per user and action type.
 * Old timestamps outside the window are automatically removed.
 */
export class RateLimiter {
  constructor(
    private config: RateLimitConfig,
    private actionType: string
  ) {}

  /**
   * Check if the user has exceeded the rate limit
   * @param userId - The user ID to check
   * @returns Object with allowed boolean and optional resetAt timestamp
   */
  async checkLimit(userId: string): Promise<RateLimitResult> {
    const key = `${this.actionType}:${userId}`;
    const now = Date.now();
    const { windowMs, maxRequests } = this.config;

    // Get existing log or create new entry
    let entry = requestLogs.get(key);
    if (!entry) {
      entry = { timestamps: [], lastCleanup: now };
      requestLogs.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

    // Check if limit exceeded
    if (entry.timestamps.length >= maxRequests) {
      // Find when the oldest request in the window expires
      const oldestTimestamp = entry.timestamps[0];
      const resetAt = new Date(oldestTimestamp + windowMs);
      return {
        allowed: false,
        resetAt
      };
    }

    // Add current request timestamp
    entry.timestamps.push(now);

    // Periodic cleanup to prevent memory leaks
    if (now - entry.lastCleanup > CLEANUP_INTERVAL || requestLogs.size > MAX_LOG_ENTRIES) {
      this.cleanup();
      entry.lastCleanup = now;
    }

    return { allowed: true };
  }

  /**
   * Remove old entries from the log to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of requestLogs.entries()) {
      // Remove timestamps older than 5 minutes
      entry.timestamps = entry.timestamps.filter(t => now - t < CLEANUP_INTERVAL);

      // Mark empty entries for deletion
      if (entry.timestamps.length === 0) {
        keysToDelete.push(key);
      }
    }

    // Delete empty entries
    for (const key of keysToDelete) {
      requestLogs.delete(key);
    }
  }

  /**
   * Reset rate limit for a specific user (for testing/admin purposes)
   */
  resetUser(userId: string): void {
    const key = `${this.actionType}:${userId}`;
    requestLogs.delete(key);
  }

  /**
   * Get current usage stats for a user
   */
  getUserStats(userId: string): { count: number; oldest?: Date; newest?: Date } {
    const key = `${this.actionType}:${userId}`;
    const entry = requestLogs.get(key);

    if (!entry || entry.timestamps.length === 0) {
      return { count: 0 };
    }

    const now = Date.now();
    const { windowMs } = this.config;
    const validTimestamps = entry.timestamps.filter(t => now - t < windowMs);

    return {
      count: validTimestamps.length,
      oldest: new Date(validTimestamps[0]),
      newest: new Date(validTimestamps[validTimestamps.length - 1])
    };
  }
}

// Rate limit configurations for different action types
const LIMITS: Record<string, RateLimitConfig> = {
  write: { windowMs: 60000, maxRequests: 10 },       // 10 requests per minute
  ai_scan: { windowMs: 60000, maxRequests: 30 },    // 30 AI scans per minute
  csv_import: { windowMs: 60000, maxRequests: 5 },  // 5 CSV imports per minute
  auth: { windowMs: 60000, maxRequests: 5 },       // 5 auth attempts per minute
};

// Export rate limiter instances for each action type
export const rateLimiter = {
  write: new RateLimiter(LIMITS.write, 'write'),
  aiScan: new RateLimiter(LIMITS.ai_scan, 'ai_scan'),
  csvImport: new RateLimiter(LIMITS.csv_import, 'csv_import'),
  auth: new RateLimiter(LIMITS.auth, 'auth'),
};
