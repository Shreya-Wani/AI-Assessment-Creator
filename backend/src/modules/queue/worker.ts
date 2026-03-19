import { Worker, Job, UnrecoverableError } from 'bullmq';
import { getRedisConnection, setJobState } from '../../services/redisService';
import { GenerationJobData } from './queue';
import { generateQuestionPaper } from '../ai/ai.service';
import { Assignment } from '../assignment/assignment.model';
import { emitProgress, emitCompleted, emitError } from '../../websocket';
import { extractPdfContent } from '../../utils/pdf.extractor';
import logger from '../../utils/logger';

let worker: Worker | null = null;

export const startWorker = (): Worker => {
  const connection = getRedisConnection();

  worker = new Worker<GenerationJobData>(
    'assignment-generation',
    async (job: Job<GenerationJobData>) => {
      const { assignmentId } = job.data;
      const jobId = job.id!;
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts || 3;

      logger.info({ jobId, assignmentId, attempt, maxAttempts }, '[JOB STARTED]');

      try {
        // Step 1: Mark processing
        await Assignment.findByIdAndUpdate(assignmentId, { status: 'processing' });
        await setJobState(jobId, 'processing');
        emitProgress(jobId, 5, 'processing');

        // Step 2: Fetch assignment
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

        // Step 2.5: Extract PDF content if not already extracted
        if (assignment.fileUrl && !assignment.extractedContent) {
          emitProgress(jobId, 15, 'extracting');
          logger.info({ assignmentId, fileUrl: assignment.fileUrl }, '[PDF] Starting extraction');
          const extractedContent = await extractPdfContent(assignment.fileUrl);
          assignment.extractedContent = extractedContent;
          await Assignment.findByIdAndUpdate(assignmentId, { extractedContent });
          logger.info({ assignmentId, contentLength: extractedContent.length }, '[PDF] Extraction complete');
        }

        // Step 3: AI generation (prompt -> LLM -> Zod-validated parse)
        const paper = await generateQuestionPaper(assignment, (progress: number) => {
          // Map progress from 0-100 to 20-100 (first 20% is PDF extraction)
          const overallProgress = 20 + (progress * 0.8);
          emitProgress(jobId, overallProgress, 'processing');
          job.updateProgress(overallProgress);
        });

        // Step 4: Persist result in DB
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'completed',
          result: paper,
        });

        // Step 5: Cache result in Redis
        const redis = getRedisConnection();
        await redis.set(`assignment:${assignmentId}`, JSON.stringify(paper), 'EX', 3600);

        await setJobState(jobId, 'completed');

        // Step 6: Emit WebSocket events
        emitProgress(jobId, 100, 'completed');
        emitCompleted(jobId, assignmentId, paper);

        logger.info({ jobId, assignmentId }, '[JOB COMPLETED]');
        return paper;
      } catch (error: any) {
        logger.error({ jobId, assignmentId, attempt, maxAttempts, error: error.message }, '[JOB FAILED]');

        const isRetryable = (error as any).isRetryable !== false;
        const errorType = (error as any).errorType || 'unknown';

        // If error is NOT retryable (e.g., quota exceeded), fail immediately without retries
        if (!isRetryable) {
          logger.error({ jobId, assignmentId, errorType }, '[JOB NOT RETRYABLE] Failing immediately');
          
          await Assignment.findByIdAndUpdate(assignmentId, {
            status: 'failed',
            result: { error: error.message, errorType, retryable: false }
          });

          await setJobState(jobId, 'failed');
          emitError(jobId, error.message);
          
          throw new UnrecoverableError(error.message);
        }

        // For retryable errors, update with attempt info and let BullMQ retry
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'failed',
          result: { 
            error: error.message, 
            errorType, 
            retryable: true,
            attempt,
            maxAttempts,
            willRetry: attempt < maxAttempts
          }
        });

        await setJobState(jobId, 'failed');
        emitError(jobId, `${error.message} (Attempt ${attempt}/${maxAttempts})`);
        
        throw error; // Let BullMQ handle retries
      }
    },
    {
      connection: connection.options as any,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[WORKER] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[WORKER] Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, '[WORKER] System error');
  });

  logger.info('BullMQ Worker initialized -> assignment-generation');
  return worker;
};
