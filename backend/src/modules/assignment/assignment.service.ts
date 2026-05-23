import { Assignment } from './assignment.model';
import { getQueue } from '../queue/queue';
import { getRedisClient, REDIS_AVAILABLE } from '../../services/redisService';
import { processAssignmentInline } from '../queue/worker';
import { CreateAssignmentInput } from './assignment.schema';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export const createAssignmentService = async (data: CreateAssignmentInput, userId: string) => {
  // Normalize questionsConfig: support both the new `questionsConfig` shape and
  // legacy/simple form fields like `questionTypes`, `numberOfQuestions`, `totalMarks`.
  let questionsConfig: any = (data as any).questionsConfig;
  if (!questionsConfig) {
    let qTypes = (data as any).questionTypes;
    const numQ = Number((data as any).numberOfQuestions) || 0;
    const totalMarks = Number((data as any).totalMarks) || 0;
    if (typeof qTypes === 'string') {
      try { qTypes = JSON.parse(qTypes); } catch { qTypes = [String(qTypes)]; }
    }

    if (Array.isArray(qTypes) && qTypes.length > 0 && numQ > 0) {
      const base = Math.floor(numQ / qTypes.length);
      const remainder = numQ % qTypes.length;
      const marksPerQuestion = numQ ? Math.max(1, Math.floor(totalMarks / numQ)) : 1;
      questionsConfig = qTypes.map((t: any, i: number) => ({
        type: String(t),
        count: i === 0 ? base + remainder : base,
        marks: marksPerQuestion,
      }));
    } else {
      questionsConfig = [{ type: 'short_answer', count: numQ || 1, marks: Math.max(1, Math.floor((totalMarks || numQ) / (numQ || 1))) }];
    }
  }

  const assignment = new Assignment({
    ...data,
    questionsConfig,
    createdBy: userId,
    status: 'pending',
  });
  await assignment.save();

  const assignmentId = assignment._id.toString();
  const queue = getQueue();

  if (queue) {
    // Queue-based processing (Redis available)
    const job = await queue.add(
      'assignment-generation',
      { assignmentId },
      { jobId: `gen-${assignmentId}`, priority: 1 }
    );
    assignment.jobId = job.id;
    await assignment.save();
    logger.info({ assignmentId, jobId: job.id }, '[ASSIGNMENT CREATED] Queued');
    return { jobId: job.id, assignmentId };
  } else {
    // Inline processing fallback (no Redis)
    const fakeJobId = `inline-${assignmentId}`;
    assignment.jobId = fakeJobId;
    await assignment.save();
    logger.info({ assignmentId, jobId: fakeJobId }, '[ASSIGNMENT CREATED] Processing inline (no queue)');
    // Run in background — don't await so the response is immediate
    processAssignmentInline(assignmentId).catch(err =>
      logger.error({ assignmentId, error: err.message }, '[INLINE] Background processing failed')
    );
    return { jobId: fakeJobId, assignmentId };
  }
};

export const getAssignmentsService = async (userId: string) => {
  return Assignment.find({ createdBy: userId }).select('-fileUrl').sort({ createdAt: -1 });
};

export const getAssignmentByIdService = async (id: string) => {
  // Cache-first: check Redis before querying MongoDB
  if (REDIS_AVAILABLE) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const cached = await redis.get(`assignment:${id}`);
        if (cached) {
          const assignment = await Assignment.findById(id).select('-fileUrl');
          if (assignment) {
            const obj = assignment.toObject();
            logger.info({ assignmentId: id, hasJobId: !!obj.jobId }, '[SERVICE] Returning cached assignment');
            return { ...obj, result: JSON.parse(cached) };
          }
        }
      }
    } catch { /* cache miss — fallback to DB */ }
  }

  const assignment = await Assignment.findById(id).select('-fileUrl');
  if (!assignment) throw new AppError('Assignment not found', 404);
  logger.info({ assignmentId: id, hasJobId: !!assignment.jobId, jobId: assignment.jobId }, '[SERVICE] Returning assignment from DB');
  return assignment;
};

export const getAssignmentStatusService = async (id: string) => {
  const assignment = await Assignment.findById(id).select('status');
  if (!assignment) throw new AppError('Assignment not found', 404);
  return assignment;
};

export const deleteAssignmentService = async (id: string, userId: string) => {
  const assignment = await Assignment.findOneAndDelete({ _id: id, createdBy: userId });
  if (!assignment) throw new AppError('Not found or unauthorized', 404);
  logger.info({ assignmentId: id }, '[ASSIGNMENT DELETED]');
  return assignment;
};

export const regenerateAssignmentService = async (id: string, userId: string) => {
  const assignment = await Assignment.findOne({ _id: id, createdBy: userId });
  if (!assignment) throw new AppError('Not found or unauthorized', 404);

  if (assignment.status === 'processing') {
    throw new AppError('Assignment is already being processed. Please wait.', 409);
  }

  assignment.status = 'pending';
  assignment.result = undefined;

  const queue = getQueue();

  if (queue) {
    const job = await queue.add(
      'assignment-generation',
      { assignmentId: id },
      { jobId: `gen-${id}-${Date.now()}`, priority: 1 }
    );
    assignment.jobId = job.id;
    await assignment.save();
    logger.info({ assignmentId: id, jobId: job.id }, '[ASSIGNMENT REGENERATED] Queued');
    return { jobId: job.id, assignmentId: assignment._id.toString() };
  } else {
    // Inline fallback
    const fakeJobId = `inline-${id}-${Date.now()}`;
    assignment.jobId = fakeJobId;
    await assignment.save();
    logger.info({ assignmentId: id, jobId: fakeJobId }, '[ASSIGNMENT REGENERATED] Processing inline');
    processAssignmentInline(id).catch(err =>
      logger.error({ assignmentId: id, error: err.message }, '[INLINE] Regeneration failed')
    );
    return { jobId: fakeJobId, assignmentId: assignment._id.toString() };
  }
};
