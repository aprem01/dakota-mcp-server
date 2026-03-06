import Redis from 'ioredis';
import crypto from 'crypto';

const USE_MOCK = process.env.USE_MOCK === 'true';

// In-memory store for mock mode (no Redis needed)
class MemoryStore {
  constructor() { this._store = new Map(); this._expiries = new Map(); }
  async get(key) {
    const exp = this._expiries.get(key);
    if (exp && Date.now() > exp) { this._store.delete(key); this._expiries.delete(key); return null; }
    return this._store.get(key) || null;
  }
  async set(key, value, ...args) {
    this._store.set(key, value);
    if (args[0] === 'EX' && args[1]) this._expiries.set(key, Date.now() + args[1] * 1000);
  }
  async del(...keys) { keys.forEach((k) => { this._store.delete(k); this._expiries.delete(k); }); }
  async scan(cursor, ...args) {
    // Simple full scan
    const matchArg = args.indexOf('MATCH');
    const pattern = matchArg >= 0 ? args[matchArg + 1] : '*';
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keys = [...this._store.keys()].filter((k) => regex.test(k));
    return ['0', keys];
  }
  async zremrangebyscore() { return 0; }
  async zadd() { return 1; }
  async zcard() { return 1; }
  async zrange() { return []; }
  async expire() { return 1; }
  pipeline() {
    const ops = [];
    const self = this;
    const p = {
      zremrangebyscore() { ops.push([null, 0]); return p; },
      zadd() { ops.push([null, 1]); return p; },
      zcard() { ops.push([null, 1]); return p; },
      expire() { ops.push([null, 1]); return p; },
      async exec() { return ops; },
    };
    return p;
  }
  on() {} // no-op for event listeners
}

let redis;

if (USE_MOCK) {
  redis = new MemoryStore();
  console.log('[Cache] Using in-memory store (mock mode)');
} else {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });
}

export { redis };

const SEARCH_TTL = 120;
const PROFILE_TTL = 300;

function hashQuery(params) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 16);
}

export async function getCached(userId, toolName, queryParams) {
  const key = `cache:${userId}:${toolName}:${hashQuery(queryParams)}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCache(userId, toolName, queryParams, result, isProfile = false) {
  const key = `cache:${userId}:${toolName}:${hashQuery(queryParams)}`;
  const ttl = isProfile ? PROFILE_TTL : SEARCH_TTL;
  await redis.set(key, JSON.stringify(result), 'EX', ttl);
}

export async function invalidateUserCache(userId) {
  const pattern = `cache:${userId}:*`;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
