import { create } from 'zustand';

interface AuthState {
  token: string | null;
  started: boolean;
  setToken: (token: string | null) => void;
  setStarted: (started: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  started: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token, started: !!token });
  },
  setStarted: (started) => set({ started }),
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, started: false });
    window.location.href = '/';
  }
}));
