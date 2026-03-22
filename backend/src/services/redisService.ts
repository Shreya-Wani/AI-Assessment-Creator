import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// ── Single shared Redis connection for the entire app ─────────────────
// BullMQ requires `maxRetriesPerRequest: null` — this connection is
// shared by Queue, Worker, and cache helpers to avoid type mismatches.

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const options: RedisOptions = {
      maxRetriesPerRequest: null, // REQUIRED for BullMQ
      retryStrategy: (times: number) => {
        // Keep retrying in production; transient DNS/network failures are common.
        return Math.min(times * 500, 10000);
      },
    };

    if (config.redis.url) {
      connection = new IORedis(config.redis.url, options);
    } else {
      connection = new IORedis({
        host: config.redis.host,
        port: config.redis.port,
        ...options,
      });
    }

    connection.on('connect', () => {
      logger.info('[REDIS] Connected');
    });

    connection.on('error', (err) => {
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
