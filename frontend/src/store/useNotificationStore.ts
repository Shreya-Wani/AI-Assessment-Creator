import { create } from 'zustand';

export type NotificationType = 'progress' | 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  createdAt: number;
  type: NotificationType;
  read: boolean;
}

interface NotificationState {
  items: AppNotification[];
  addNotification: (payload: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  addNotification: (payload) =>
    set((state) => {
      const nextItem: AppNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: payload.message,
        type: payload.type,
        createdAt: Date.now(),
        read: false,
      };

      return {
        items: [nextItem, ...state.items].slice(0, 30),
      };
    }),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
    })),
  clearAll: () => set({ items: [] }),
}));
