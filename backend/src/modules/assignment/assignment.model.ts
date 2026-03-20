import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionConfig {
  type: string;
  count: number;
  marks: number;
}

export interface IQuestion {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

export interface ISection {
  title: string;
  instructions: string;
  questions: IQuestion[];
}

export interface IResult {
  sections: ISection[];
}

// Error result types for tracking failures
export interface IErrorResult {
  error: string;
  errorType?: 'quota' | 'temporary' | 'validation' | 'unknown';
  retryable?: boolean;
  attempt?: number;
  maxAttempts?: number;
  willRetry?: boolean;
}

// Alias for ai.service.ts — IQuestionPaper is the generated output shape
export type IQuestionPaper = IResult;

export interface IAssignment extends Document {
  title: string;
  dueDate: Date;
  questionsConfig: IQuestionConfig[];
  instructions: string;
  fileUrl: string;
  extractedContent?: string; // PDF text content extracted from fileUrl
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: IResult | IErrorResult;
  createdBy: mongoose.Types.ObjectId;
  jobId?: string;
}

const QuestionConfigSchema = new Schema<IQuestionConfig>({
  type: { type: String, required: true },
  count: { type: Number, required: true },
  marks: { type: Number, required: true }
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  question: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  marks: { type: Number, required: true },
}, { _id: false });

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instructions: { type: String },
  questions: [QuestionSchema],
}, { _id: false });

const AssignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true },
  subject: { type: String, default: '' },
  grade: { type: String, default: '' },
  duration: { type: Schema.Types.Mixed, default: '' },
  totalMarks: { type: Number, default: 0 },
  numberOfQuestions: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  questionsConfig: [QuestionConfigSchema],
  instructions: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  extractedContent: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  result: {
    sections: [SectionSchema]
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: String }
}, { timestamps: true });

// ── Database Indexes (Query Optimization) ─────────────────────────────
AssignmentSchema.index({ createdBy: 1 });
AssignmentSchema.index({ status: 1 });
AssignmentSchema.index({ createdBy: 1, status: 1 });

// ── Difficulty Color Map (Frontend Impact) ────────────────────────────
export const difficultyColorMap: Record<string, string> = {
  easy: '#22c55e',
  medium: '#eab308',
  hard: '#ef4444',
};

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
