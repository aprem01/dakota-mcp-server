import { redis } from '../cache/redis.js';

const TIER_LIMITS = {
  standard: 100,
  premium: 500,
};

const WINDOW_SECONDS = 3600; // 1 hour rolling window

export async function checkRateLimit(userId, customerTier) {
  const tier = customerTier || 'standard';
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.standard;
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;

  // Use Redis sorted set for sliding window
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}:${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, WINDOW_SECONDS);
  const results = await pipeline.exec();

  const count = results[2][1]; // zcard result

  if (count > limit) {
    // Find oldest entry to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldest.length >= 2
      ? new Date(parseInt(oldest[1], 10) + WINDOW_SECONDS * 1000)
      : new Date(now + WINDOW_SECONDS * 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: resetAt.toISOString(),
    };
  }

  return {
    allowed: true,
    limit,
    remaining: limit - count,
    resetAt: null,
  };
}
