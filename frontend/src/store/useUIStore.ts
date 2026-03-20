import { create } from 'zustand';

interface UIState {
  mobileSidebarOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  open: () => set({ mobileSidebarOpen: true }),
  close: () => set({ mobileSidebarOpen: false }),
  toggle: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
}));
