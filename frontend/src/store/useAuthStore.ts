import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

interface User {
  _id: string;
  email: string;
  schoolName: string;
  location: string;
  avatarUrl?: string;
  role: 'TEACHER' | 'STUDENT';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, schoolName: string, location: string, role?: string) => Promise<void>;
  updateProfile: (payload: { schoolName: string; location: string; avatar?: File | null; avatarUrl?: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const normalizeAvatarUrl = (avatarUrl?: string): string | undefined => {
  if (!avatarUrl) return avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) return `${API_ORIGIN}${avatarUrl}`;
  return avatarUrl;
};

const normalizeUser = <T extends User | null>(user: T): T => {
  if (!user) return user;
  return {
    ...user,
    avatarUrl: normalizeAvatarUrl(user.avatarUrl),
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      fetchMe: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
          throw new Error('You are not logged in');
        }

        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch profile');
          }

          set((state) => ({ user: normalizeUser(data), token: state.token, error: null }));
        } catch (error: unknown) {
          set({ error: toErrorMessage(error, 'Failed to fetch profile') });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          set({ user: normalizeUser(data), token: data.token, isLoading: false });
        } catch (error: unknown) {
          const message = toErrorMessage(error, 'Login failed');
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (email, password, schoolName, location, role = 'TEACHER') => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, schoolName, location, role }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Registration failed');
          set({ user: normalizeUser(data), token: data.token, isLoading: false });
        } catch (error: unknown) {
          set({ isLoading: false, error: toErrorMessage(error, 'Registration failed') });
          throw error;
        }
      },

      updateProfile: async ({ schoolName, location, avatar, avatarUrl }) => {
        const token = useAuthStore.getState().token;
        if (!token) {
          throw new Error('You are not logged in');
        }

        set({ isLoading: true, error: null });
        try {
          const formData = new FormData();
          formData.append('schoolName', schoolName);
          formData.append('location', location);
          if (avatar) {
            formData.append('avatar', avatar);
          } else if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
            formData.append('avatarUrl', avatarUrl.trim());
          }

          const res = await fetch(`${API_URL}/auth/me`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to update profile');
          }

          set((state) => ({ user: normalizeUser(data), isLoading: false, error: null, token: state.token }));
        } catch (error: unknown) {
          set({ isLoading: false, error: toErrorMessage(error, 'Failed to update profile') });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'vedaai-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
