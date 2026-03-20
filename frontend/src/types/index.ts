export interface Question {
  number: number;
  text: string;
  type: 'mcq' | 'short_answer' | 'long_answer' | 'true_false' | 'fill_blank';
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: string[];
  answer?: string;
}

export interface Section {
  name: string;
  title: string;
  instructions: string;
  questions: Question[];
}

export interface QuestionPaper {
  title: string;
  subject: string;
  totalMarks: number;
  duration: string | number;
  generalInstructions: string[];
  sections: Section[];
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  dueDate: string;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  duration?: string | number;
  difficulty: string;
  additionalInstructions: string;
  fileName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  generatedPaper?: QuestionPaper;
  jobId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentFormData {
  title: string;
  subject: string;
  grade: string;
  topic: string;
  dueDate: string;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  duration?: string | number;
  difficulty: string;
  additionalInstructions: string;
  file?: File | null;
}

export type QuestionType = {
  id: string;
  label: string;
  icon: string;
};

export const QUESTION_TYPES: QuestionType[] = [
  { id: 'mcq', label: 'Multiple Choice', icon: '☑' },
  { id: 'short_answer', label: 'Short Answer', icon: '✏️' },
  { id: 'long_answer', label: 'Long Answer', icon: '📝' },
  { id: 'true_false', label: 'True / False', icon: '✓✗' },
  { id: 'fill_blank', label: 'Fill in Blanks', icon: '___' },
];

export const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Easy', color: '#22c55e' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'hard', label: 'Hard', color: '#ef4444' },
  { id: 'mixed', label: 'Mixed', color: '#8b5cf6' },
];
