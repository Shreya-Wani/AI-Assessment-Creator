import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

interface DashboardStats {
  totalAssignments: number;
  activeStudents: number;
  avgCompletion: number;
  recentAssignments: Array<{
    _id: string;
    title: string;
    status: string;
    createdAt: string;
    dueDate: string;
  }>;
}

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      set({ stats: data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard';
      set({ stats: null, isLoading: false, error: message });
    }
  },
}));
