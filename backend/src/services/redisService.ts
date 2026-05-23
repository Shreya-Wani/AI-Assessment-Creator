import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// ── Redis connection helpers ───────────────────────────────────────────
// Redis is optional: if the URL is missing or unreachable the app
// continues in degraded mode (no caching / no BullMQ queuing).

export let REDIS_AVAILABLE = false;

function buildRedisOptions(): RedisOptions {
  const base: RedisOptions = {
    maxRetriesPerRequest: null, // REQUIRED for BullMQ
    enableReadyCheck: false,
    keepAlive: 10000,
    connectTimeout: 15000,
    lazyConnect: true,            // Don't auto-connect on creation
    retryStrategy: (times: number) => {
      if (times > 5) return null; // Stop retrying after 5 attempts
      return Math.min(times * 1000, 10000);
    },
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

// Export options so BullMQ Queue and Worker can create their own connections
export function getRedisOptions(): RedisOptions {
  return buildRedisOptions();
}

// ── Single shared Redis connection ─────────────────────────────────────
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis | null {
  if (!config.redis.url && config.redis.host === 'localhost') {
    // No Redis configured at all
    return null;
  }

  if (!connection) {
    connection = new IORedis(buildRedisOptions());

    connection.on('ready', () => {
      REDIS_AVAILABLE = true;
      logger.info('[REDIS] Connected and ready');
    });

    connection.on('error', (err) => {
      REDIS_AVAILABLE = false;
      if (err.message.includes('ECONNRESET')) return;
      // Log once per error type, don't spam
      logger.warn({ error: err.message }, '[REDIS] Connection error (running in degraded mode)');
    });

    connection.on('close', () => {
      REDIS_AVAILABLE = false;
    });

    // Attempt connection
    connection.connect().catch((err) => {
      logger.warn({ error: err.message }, '[REDIS] Initial connection failed - running without Redis');
    });
  }

  return connection;
}

// Legacy alias
export const getRedisClient = getRedisConnection;

// ── Cache helpers (all null-safe) ──────────────────────────────────────
const CACHE_TTL = 3600;

export async function getCachedPaper(assignmentId: string): Promise<string | null> {
  const client = getRedisConnection();
  if (!client || !REDIS_AVAILABLE) return null;
  try {
    return await client.get(`paper:${assignmentId}`);
  } catch {
    return null;
  }
}

export async function cachePaper(assignmentId: string, paper: object): Promise<void> {
  const client = getRedisConnection();
  if (!client || !REDIS_AVAILABLE) return;
  try {
    await client.set(`paper:${assignmentId}`, JSON.stringify(paper), 'EX', CACHE_TTL);
  } catch (err: any) {
    logger.warn({ error: err.message }, '[REDIS] Cache write skipped');
  }
}

export async function getJobState(jobId: string): Promise<string | null> {
  const client = getRedisConnection();
  if (!client || !REDIS_AVAILABLE) return null;
  try {
    return await client.get(`job:${jobId}:state`);
  } catch {
    return null;
  }
}

export async function setJobState(jobId: string, state: string): Promise<void> {
  const client = getRedisConnection();
  if (!client || !REDIS_AVAILABLE) return;
  try {
    await client.set(`job:${jobId}:state`, state, 'EX', 3600);
  } catch (err: any) {
    logger.warn({ error: err.message }, '[REDIS] Job state write skipped');
  }
}

export async function closeRedis(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
    REDIS_AVAILABLE = false;
  }
}
