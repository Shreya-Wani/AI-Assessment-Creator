import { create } from 'zustand';
import { Assignment, AssignmentFormData } from '@/types';
import { apiFetch } from '@/lib/api';

type AssignmentCreatePayload = FormData | {
  title: string;
  subject: string;
  grade: string;
  topic?: string;
  dueDate?: string;
  examDate?: string;
  questionTypes?: string[];
  numberOfQuestions?: number;
  totalMarks?: number;
  duration?: string | number;
  difficulty?: string;
  additionalInstructions?: string;
};

const getPayloadField = (
  payload: AssignmentCreatePayload,
  key: string,
  fallback = ''
): string => {
  if (payload instanceof FormData) {
    const value = payload.get(key);
    return typeof value === 'string' ? value : fallback;
  }

  const value = payload[key as keyof typeof payload];
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return fallback;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

interface AssignmentState {
  formData: AssignmentFormData;
  setFormField: <K extends keyof AssignmentFormData>(key: K, value: AssignmentFormData[K]) => void;
  resetForm: () => void;

  currentAssignment: Assignment | null;
  assignments: Assignment[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  progress: number;
  generationStatus: string;

  createAssignment: (formData: AssignmentCreatePayload) => Promise<string>;
  fetchAssignment: (id: string) => Promise<void>;
  fetchAssignments: () => Promise<void>;
  regenerateAssignment: (id: string) => Promise<void>;
  updateProgress: (progress: number, status: string) => void;
  setCurrentAssignment: (assignment: Assignment) => void;
  setError: (error: string | null) => void;
  clearCurrentAssignment: () => void;
}

const initialFormData: AssignmentFormData = {
  title: '',
  subject: '',
  grade: '',
  topic: '',
  dueDate: '',
  questionTypes: ['mcq'],
  numberOfQuestions: 10,
  totalMarks: 50,
  duration: 45,
  difficulty: 'mixed',
  additionalInstructions: '',
  file: null,
};

export const useAssignmentStore = create<AssignmentState>((set) => ({
  formData: { ...initialFormData },
  currentAssignment: null,
  assignments: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  progress: 0,
  generationStatus: '',

  setFormField: (key, value) => {
    set((state) => ({
      formData: { ...state.formData, [key]: value },
    }));
  },

  resetForm: () => {
    set({ formData: { ...initialFormData } });
  },

  createAssignment: async (payload: AssignmentCreatePayload) => {
    set({ isSubmitting: true, error: null });
    try {
      // Support both JSON payloads and FormData
      const options: RequestInit = { method: 'POST', body: payload instanceof FormData ? payload : JSON.stringify(payload) };
      const response = await apiFetch('/assignments', options);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assignment');
      }

      const data = await response.json();

      // Store the jobId immediately so the assessment page can use it
      const assignmentId: string = data.assignmentId || data.assignment?._id;
      const assignmentJobId: string | undefined = data.jobId || data.assignment?.jobId;
      const nextAssignment: Assignment = {
        _id: assignmentId,
        jobId: assignmentJobId,
        status: 'pending',
        progress: 0,
        title: getPayloadField(payload, 'title'),
        subject: getPayloadField(payload, 'subject'),
        grade: getPayloadField(payload, 'grade'),
        topic: getPayloadField(payload, 'topic'),
        dueDate: getPayloadField(payload, 'dueDate', new Date().toISOString().slice(0, 10)),
        examDate: getPayloadField(payload, 'examDate') || undefined,
        questionTypes: payload instanceof FormData
          ? (() => {
            try {
              return JSON.parse(getPayloadField(payload, 'questionTypes', '[]')) as string[];
            } catch {
              return [];
            }
          })()
          : (payload.questionTypes || []),
        numberOfQuestions: Number(getPayloadField(payload, 'numberOfQuestions', '0')),
        totalMarks: Number(getPayloadField(payload, 'totalMarks', '0')),
        duration: getPayloadField(payload, 'duration') || undefined,
        difficulty: getPayloadField(payload, 'difficulty', 'mixed'),
        additionalInstructions: getPayloadField(payload, 'additionalInstructions'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({
        isSubmitting: false,
        progress: 0,
        generationStatus: 'pending',
        currentAssignment: nextAssignment,
      });

      return assignmentId;
    } catch (error: unknown) {
      set({ isSubmitting: false, error: toErrorMessage(error, 'Failed to create assignment') });
      throw error;
    }
  },

  fetchAssignment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`/assignments/${id}`);
      if (!response.ok) {
        throw new Error('Assignment not found');
      }
      const data = await response.json();
      // Handle both old and new API response shapes
      const rawAssignment = data.assignment || data;
      const assignment = rawAssignment?._doc
        ? { ...rawAssignment._doc, ...rawAssignment }
        : rawAssignment;
      
      console.log('Fetched assignment:', assignment);
      console.log('Assignment jobId:', assignment.jobId);
      
      set({
        currentAssignment: assignment,
        isLoading: false,
        progress: assignment.progress || 0,
        generationStatus: assignment.status,
      });
    } catch (error: unknown) {
      set({ isLoading: false, error: toErrorMessage(error, 'Failed to fetch assignment') });
    }
  },

  fetchAssignments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch('/assignments');
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const data = await response.json();
      set({ assignments: data.assignments || [], isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: toErrorMessage(error, 'Failed to fetch assignments'), assignments: [] });
    }
  },

  regenerateAssignment: async (id: string) => {
    set({ isSubmitting: true, error: null, progress: 0, generationStatus: 'pending' });
    try {
      const response = await apiFetch(`/assignments/${id}/regenerate`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate');
      }
      set({ isSubmitting: false });
    } catch (error: unknown) {
      set({ isSubmitting: false, error: toErrorMessage(error, 'Failed to regenerate') });
    }
  },

  updateProgress: (progress, status) => {
    set({ progress, generationStatus: status });
  },

  setCurrentAssignment: (assignment) => {
    set({ currentAssignment: assignment });
  },

  setError: (error) => {
    set({ error });
  },

  clearCurrentAssignment: () => {
    set({ currentAssignment: null, progress: 0, generationStatus: '' });
  },
}));
