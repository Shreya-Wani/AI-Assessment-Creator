import { Queue } from 'bullmq';
import { getRedisConnection } from '../../services/redisService';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export interface GenerationJobData {
  assignmentId: string;
}

let queue: Queue<GenerationJobData> | null = null;

export const getQueue = (): Queue<GenerationJobData> => {
  if (!queue) {
    const connection = getRedisConnection();
    queue = new Queue<GenerationJobData>('assignment-generation', {
      connection: connection.options as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
    logger.info('BullMQ Queue initialized -> assignment-generation with retry strategy: 3 attempts with exponential backoff');
  }
  return queue!;
};

// Job Progress Fallback API (polling support)
export const getJobProgress = async (jobId: string) => {
  const q = getQueue();
  const job = await q.getJob(jobId);
  if (!job) throw new AppError('Job not found', 404);

  return {
    jobId: job.id,
    progress: job.progress,
    state: await job.getState(),
    assignmentId: job.data.assignmentId,
  };
};
