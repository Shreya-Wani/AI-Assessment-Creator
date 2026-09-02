import OpenAI from 'openai';
import { config } from '../../config';
import { IAssignment, IQuestionPaper } from '../assignment/assignment.model';
import { buildPrompt } from './prompt.builder';
import { parseResponse } from './response.parser';
import logger from '../../utils/logger';

const groq = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

const GROQ_MODEL = 'openai/gpt-oss-120b';

logger.info(`[AI] Initialized Groq API with model: ${GROQ_MODEL}`);

// Helper to classify API errors
const classifyApiError = (error: any): { type: 'quota' | 'temporary' | 'validation' | 'unknown'; isRetryable: boolean } => {
  const message = error.message?.toLowerCase() || '';
  const status = error?.status;

  // Quota exceeded errors - NOT retryable
  if ((status === 429 && message.includes('quota')) || message.includes('quota exceeded') || message.includes('resource exhausted')) {
    return { type: 'quota', isRetryable: false };
  }

  // Rate limit (429 with rate limit message) - retryable with backoff
  if (status === 429 || message.includes('rate limit')) {
    return { type: 'temporary', isRetryable: true };
  }

  // Validation errors (400) - NOT retryable
  if (status === 400 || message.includes('invalid')) {
    return { type: 'validation', isRetryable: false };
  }

  // Server errors (5xx) or connection errors - retryable
  if (status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || message.includes('deadline exceeded') || message.includes('timeout')) {
    return { type: 'temporary', isRetryable: true };
  }

  return { type: 'unknown', isRetryable: true };
};

// Helper to add timeout to async operations
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`API request timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
};

export const generateQuestionPaper = async (
  assignment: IAssignment,
  onProgress?: (progress: number) => void
): Promise<IQuestionPaper> => {
  try {
    onProgress?.(10);

    const prompt = buildPrompt(assignment);

    onProgress?.(30);

    const completion = await withTimeout(
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        top_p: 0.95,
      }),
      60000 // 60 second timeout
    );

    onProgress?.(70);

    const text = completion.choices[0]?.message?.content || '';

    onProgress?.(80);
    const paper = parseResponse(text);

    onProgress?.(100);
    return paper;
  } catch (error: any) {
    logger.error({ error: error.message, status: error?.status, code: error.code }, '[AI] Generation failed');

    // Classify the error to determine if it's retryable
    const errorClassification = classifyApiError(error);

    let userMessage = '';
    if (errorClassification.type === 'quota') {
      userMessage = 'Groq API quota exceeded. Please check your Groq Console quota limits or upgrade your plan.';
    } else if (errorClassification.type === 'validation') {
      userMessage = 'Invalid request configuration. Please check your assignment settings and try again.';
    } else if (errorClassification.type === 'temporary') {
      userMessage = `Temporary API error: ${error.message}. The system will retry automatically.`;
    } else {
      userMessage = error.message || 'Unexpected AI processing error';
    }

    const err = new Error(userMessage);
    (err as any).isRetryable = errorClassification.isRetryable;
    (err as any).errorType = errorClassification.type;
    throw err;
  }
};
