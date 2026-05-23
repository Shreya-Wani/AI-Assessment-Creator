import { Queue } from 'bullmq';
import { getRedisOptions, REDIS_AVAILABLE } from '../../services/redisService';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export interface GenerationJobData {
  assignmentId: string;
}

let queue: Queue<GenerationJobData> | null = null;

export const getQueue = (): Queue<GenerationJobData> | null => {
  if (!REDIS_AVAILABLE) return null;

  if (!queue) {
    queue = new Queue<GenerationJobData>('assignment-generation', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
    logger.info('BullMQ Queue initialized -> assignment-generation (3 attempts, exponential backoff)');
  }
  return queue;
};

export const getJobProgress = async (jobId: string) => {
  const q = getQueue();
  if (!q) throw new AppError('Queue unavailable (Redis not connected)', 503);

  const job = await q.getJob(jobId);
  if (!job) throw new AppError('Job not found', 404);

  return {
    jobId: job.id,
    progress: job.progress,
    state: await job.getState(),
    assignmentId: job.data.assignmentId,
  };
};
