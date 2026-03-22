import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export interface LibraryFile {
  _id: string;
  name: string;
  type: string;
  folder: string;
  folderId?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface LibraryFolder {
  _id: string;
  name: string;
  category: string;
  createdAt: string;
}

interface LibraryState {
  files: LibraryFile[];
  folders: LibraryFolder[];
  isLoading: boolean;
  error: string | null;
  fetchFiles: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  createFolder: (data: { name: string; category: string }) => Promise<void>;
  uploadToFolder: (payload: { folderId: string; file: File }) => Promise<void>;
  addFile: (data: { name: string; type: string; folder: string }) => Promise<void>;
  updateFile: (id: string, data: { name?: string; type?: string; folder?: string }) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  clearError: () => void;
}

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const parseApiError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const data = await res.json();
    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // Intentionally ignore JSON parse errors and use fallback message.
  }

  return fallback;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  files: [],
  folders: [],
  isLoading: false,
  error: null,

  fetchFiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch('/library');
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch library'));
      const data = await res.json();
      set({ files: data, isLoading: false });
    } catch (error: unknown) {
      set({ files: [], isLoading: false, error: toErrorMessage(error, 'Failed to fetch library') });
    }
  },

  fetchFolders: async () => {
    try {
      const res = await apiFetch('/library/folders');
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch folders'));
      const data = await res.json();
      set({ folders: data });
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to fetch folders') });
    }
  },

  createFolder: async (data) => {
    try {
      const res = await apiFetch('/library/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create folder'));
      await get().fetchFolders();
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to create folder') });
    }
  },

  uploadToFolder: async ({ folderId, file }) => {
    try {
      const form = new FormData();
      form.append('folderId', folderId);
      form.append('file', file);

      const res = await apiFetch('/library/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to upload file'));
      await Promise.all([get().fetchFiles(), get().fetchFolders()]);
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to upload file') });
    }
  },

  addFile: async (data) => {
    try {
      const res = await apiFetch('/library', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to add file'));
      await get().fetchFiles();
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to add file') });
    }
  },

  updateFile: async (id, data) => {
    try {
      const res = await apiFetch(`/library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update file'));
      await get().fetchFiles();
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to update file') });
    }
  },

  deleteFile: async (id) => {
    try {
      const res = await apiFetch(`/library/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete file'));
      await get().fetchFiles();
    } catch (error: unknown) {
      set({ error: toErrorMessage(error, 'Failed to delete file') });
    }
  },

  clearError: () => set({ error: null }),
}));
