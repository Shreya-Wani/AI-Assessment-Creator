import { create } from 'zustand';
import { Assignment, AssignmentFormData } from '@/types';
import { apiFetch } from '@/lib/api';

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

  createAssignment: (formData: any) => Promise<string>;
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

  createAssignment: async (payload: any) => {
    set({ isSubmitting: true, error: null });
    try {
      // Support both JSON payloads and FormData
      const options: RequestInit = { method: 'POST', body: payload instanceof FormData ? payload : JSON.stringify(payload) };
      const response = await apiFetch('/assignments', options as RequestInit);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assignment');
      }

      const data = await response.json();

      // Store the jobId immediately so the assessment page can use it
      set({
        isSubmitting: false,
        progress: 0,
        generationStatus: 'pending',
        currentAssignment: {
          _id: data.assignmentId || data.assignment?._id,
          jobId: data.jobId || data.assignment?.jobId,
          status: 'pending',
          title: payload instanceof FormData ? payload.get('title') as string : payload.title,
          subject: payload instanceof FormData ? payload.get('subject') as string : payload.subject,
          grade: payload instanceof FormData ? payload.get('grade') as string : payload.grade,
          totalMarks: payload instanceof FormData ? Number(payload.get('totalMarks')) : payload.totalMarks,
          duration: payload instanceof FormData ? payload.get('duration') : payload.duration,
        } as any,
      });

      return data.assignmentId || data.assignment?._id;
    } catch (error: any) {
      set({ isSubmitting: false, error: error.message });
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
      const assignment = data.assignment || data;
      
      console.log('Fetched assignment:', assignment);
      console.log('Assignment jobId:', assignment.jobId);
      
      set({
        currentAssignment: assignment,
        isLoading: false,
        progress: assignment.progress || 0,
        generationStatus: assignment.status,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
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
    } catch (error: any) {
      set({ isLoading: false, error: error.message, assignments: [] });
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
    } catch (error: any) {
      set({ isSubmitting: false, error: error.message });
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
