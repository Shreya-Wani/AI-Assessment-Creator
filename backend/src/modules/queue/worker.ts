import { Worker, Job, UnrecoverableError } from 'bullmq';
import { getRedisOptions, setJobState, REDIS_AVAILABLE } from '../../services/redisService';
import { GenerationJobData } from './queue';
import { generateQuestionPaper } from '../ai/ai.service';
import { Assignment } from '../assignment/assignment.model';
import { emitProgress, emitCompleted, emitError } from '../../websocket';
import { extractPdfContent } from '../../utils/pdf.extractor';
import logger from '../../utils/logger';

let worker: Worker | null = null;

export const startWorker = (): Worker | null => {
  if (!REDIS_AVAILABLE) {
    logger.warn('[WORKER] Redis unavailable — BullMQ worker NOT started. Assignments will be processed inline.');
    return null;
  }

  worker = new Worker<GenerationJobData>(
    'assignment-generation',
    async (job: Job<GenerationJobData>) => {
      const { assignmentId } = job.data;
      const jobId = job.id!;
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts || 3;

      logger.info({ jobId, assignmentId, attempt, maxAttempts }, '[JOB STARTED]');

      try {
        await Assignment.findByIdAndUpdate(assignmentId, { status: 'processing' });
        await setJobState(jobId, 'processing');
        emitProgress(jobId, 5, 'processing');

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

        if (assignment.fileUrl && !assignment.extractedContent) {
          emitProgress(jobId, 15, 'extracting');
          logger.info({ assignmentId, fileUrl: assignment.fileUrl }, '[PDF] Starting extraction');
          const extractedContent = await extractPdfContent(assignment.fileUrl);
          assignment.extractedContent = extractedContent;
          await Assignment.findByIdAndUpdate(assignmentId, { extractedContent });
          logger.info({ assignmentId, contentLength: extractedContent.length }, '[PDF] Extraction complete');
        }

        const paper = await generateQuestionPaper(assignment, (progress: number) => {
          const overallProgress = 20 + (progress * 0.8);
          emitProgress(jobId, overallProgress, 'processing');
          job.updateProgress(overallProgress);
        });

        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'completed',
          result: paper,
        });

        await setJobState(jobId, 'completed');
        emitProgress(jobId, 100, 'completed');
        emitCompleted(jobId, assignmentId, paper);

        logger.info({ jobId, assignmentId }, '[JOB COMPLETED]');
        return paper;
      } catch (error: any) {
        logger.error({ jobId, assignmentId, attempt, maxAttempts, error: error.message }, '[JOB FAILED]');

        const isRetryable = (error as any).isRetryable !== false;
        const errorType = (error as any).errorType || 'unknown';

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
        throw error;
      }
    },
    {
      connection: getRedisOptions(),
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
    if (err.message.includes('ECONNRESET') || err.message.includes('ENOTFOUND')) return;
    logger.error({ error: err.message }, '[WORKER] System error');
  });

  logger.info('BullMQ Worker initialized -> assignment-generation');
  return worker;
};

// ── Inline (no-Redis) fallback processor ─────────────────────────────
// Called directly from the assignment controller when Redis/BullMQ is unavailable.
export const processAssignmentInline = async (assignmentId: string): Promise<void> => {
  logger.info({ assignmentId }, '[INLINE] Processing assignment without queue');
  try {
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'processing' });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

    if (assignment.fileUrl && !assignment.extractedContent) {
      const extractedContent = await extractPdfContent(assignment.fileUrl);
      assignment.extractedContent = extractedContent;
      await Assignment.findByIdAndUpdate(assignmentId, { extractedContent });
    }

    const paper = await generateQuestionPaper(assignment);
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'completed', result: paper });

    // Emit via WebSocket if available
    emitCompleted('inline-' + assignmentId, assignmentId, paper);
    logger.info({ assignmentId }, '[INLINE] Assignment processed successfully');
  } catch (error: any) {
    logger.error({ assignmentId, error: error.message }, '[INLINE] Processing failed');
    await Assignment.findByIdAndUpdate(assignmentId, {
      status: 'failed',
      result: { error: error.message }
    });
    emitError('inline-' + assignmentId, error.message);
  }
};
