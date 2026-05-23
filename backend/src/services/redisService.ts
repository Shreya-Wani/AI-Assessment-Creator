import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// ── Redis connection helpers ───────────────────────────────────────────
// Redis is optional: if the URL is missing or unreachable the app
// continues in degraded mode (no caching / no BullMQ queuing).

export let REDIS_AVAILABLE = false;

// Track whether we've already logged the failure so we don't spam logs
let permanentlyFailed = false;

function buildRedisOptions(): RedisOptions {
  const base: RedisOptions = {
    maxRetriesPerRequest: null, // REQUIRED for BullMQ
    enableReadyCheck: false,
    keepAlive: 10000,
    connectTimeout: 10000,
    lazyConnect: true,
    // Return null = stop retrying immediately. We handle retry logic ourselves.
    retryStrategy: () => null,
  };

  if (config.redis.url) {
    const isTLS = config.redis.url.startsWith('rediss://');
    const url = new URL(config.redis.url.replace(/^rediss?:\/\//, 'https://'));
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      username: url.username || 'default',
      password: decodeURIComponent(url.password),
      tls: isTLS ? {} : undefined,
      ...base,
    };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    ...base,
  };
}

// Export options for BullMQ (Queue / Worker create their own connections)
export function getRedisOptions(): RedisOptions {
  return buildRedisOptions();
}

// ── Single shared Redis connection ─────────────────────────────────────
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis | null {
  // No Redis configured
  if (!config.redis.url && config.redis.host === 'localhost') return null;

  // Already confirmed unreachable — don't create another connection
  if (permanentlyFailed) return null;

  if (!connection) {
    connection = new IORedis(buildRedisOptions());

    connection.on('ready', () => {
      REDIS_AVAILABLE = true;
      logger.info('[REDIS] Connected and ready');
    });

    connection.on('error', (err: any) => {
      REDIS_AVAILABLE = false;

      // ECONNRESET on idle connections is normal — suppress
      if (err.message?.includes('ECONNRESET')) return;

      // DNS failure = host doesn't exist, no point retrying — kill connection
      if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
        if (!permanentlyFailed) {
          permanentlyFailed = true;
          logger.warn(
            { host: err.hostname || err.message },
            '[REDIS] Host unreachable (ENOTFOUND) — disabling Redis. App will run without caching/queuing.'
          );
          // Destroy to prevent any further reconnection attempts
          connection?.disconnect();
          connection = null;
        }
        return;
      }

      logger.warn({ error: err.message }, '[REDIS] Connection error (degraded mode)');
    });

    connection.on('close', () => {
      REDIS_AVAILABLE = false;
    });

    // Single connection attempt — retryStrategy is null so no auto-retry
    connection.connect().catch(() => {
      // Error already handled by the 'error' event listener above
    });
  }

  return connection;
}

// Legacy alias
export const getRedisClient = getRedisConnection;

// ── Cache helpers (all null-safe) ──────────────────────────────────────
const CACHE_TTL = 3600;

export async function getCachedPaper(assignmentId: string): Promise<string | null> {
  if (!REDIS_AVAILABLE) return null;
  const client = getRedisConnection();
  if (!client) return null;
  try { return await client.get(`paper:${assignmentId}`); } catch { return null; }
}

export async function cachePaper(assignmentId: string, paper: object): Promise<void> {
  if (!REDIS_AVAILABLE) return;
  const client = getRedisConnection();
  if (!client) return;
  try {
    await client.set(`paper:${assignmentId}`, JSON.stringify(paper), 'EX', CACHE_TTL);
  } catch { /* silently skip */ }
}

export async function getJobState(jobId: string): Promise<string | null> {
  if (!REDIS_AVAILABLE) return null;
  const client = getRedisConnection();
  if (!client) return null;
  try { return await client.get(`job:${jobId}:state`); } catch { return null; }
}

export async function setJobState(jobId: string, state: string): Promise<void> {
  if (!REDIS_AVAILABLE) return;
  const client = getRedisConnection();
  if (!client) return;
  try {
    await client.set(`job:${jobId}:state`, state, 'EX', 3600);
  } catch { /* silently skip */ }
}

export async function closeRedis(): Promise<void> {
  if (connection) {
    await connection.quit().catch(() => {});
    connection = null;
    REDIS_AVAILABLE = false;
  }
}
