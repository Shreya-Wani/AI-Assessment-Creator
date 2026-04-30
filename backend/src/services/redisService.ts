import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// ── Redis connection helpers for Upstash (TLS) + BullMQ ───────────────
// BullMQ internally duplicates connections. When using `rediss://` URLs,
// the TLS settings get lost during duplication. To fix this, we parse the
// URL explicitly and provide `tls: {}` in the options object.

function buildRedisOptions(): RedisOptions {
  const base: RedisOptions = {
    maxRetriesPerRequest: null, // REQUIRED for BullMQ
    enableReadyCheck: false,
    keepAlive: 10000,
    connectTimeout: 15000,
    retryStrategy: (times: number) => {
      return Math.min(times * 500, 10000);
    },
  };

  if (config.redis.url) {
    const isTLS = config.redis.url.startsWith('rediss://');
    // Parse the URL by replacing rediss:// with https:// so URL class can handle it
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

// ── Single shared Redis connection for cache helpers ──────────────────
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(buildRedisOptions());

    connection.on('ready', () => {
      logger.info('[REDIS] Connected and ready');
    });

    connection.on('error', (err) => {
      if (err.message.includes('ECONNRESET')) return;
      logger.error({ error: err.message }, '[REDIS] Connection error');
    });
  }

  return connection;
}

// Legacy alias — backward compatibility with existing imports
export const getRedisClient = getRedisConnection;

// ── Cache helpers ─────────────────────────────────────────────────────
const CACHE_TTL = 3600; // 1 hour

export async function getCachedPaper(assignmentId: string): Promise<string | null> {
  const client = getRedisConnection();
  try {
    return await client.get(`paper:${assignmentId}`);
  } catch {
    return null;
  }
}

export async function cachePaper(assignmentId: string, paper: object): Promise<void> {
  const client = getRedisConnection();
  try {
    await client.set(`paper:${assignmentId}`, JSON.stringify(paper), 'EX', CACHE_TTL);
  } catch (err: any) {
    logger.error({ error: err.message }, '[REDIS] Cache write error');
  }
}

export async function getJobState(jobId: string): Promise<string | null> {
  const client = getRedisConnection();
  try {
    return await client.get(`job:${jobId}:state`);
  } catch {
    return null;
  }
}

export async function setJobState(jobId: string, state: string): Promise<void> {
  const client = getRedisConnection();
  try {
    await client.set(`job:${jobId}:state`, state, 'EX', 3600);
  } catch (err: any) {
    logger.error({ error: err.message }, '[REDIS] Job state write error');
  }
}

export async function closeRedis(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
