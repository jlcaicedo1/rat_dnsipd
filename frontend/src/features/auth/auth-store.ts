import { create } from "zustand";
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
  type AuthSession,
  type AuthUser,
} from "./auth-storage";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (session: AuthSession) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const session = getStoredSession();

    set({
      token: session?.token ?? null,
      user: session?.user ?? null,
      hydrated: true,
    });
  },
  setSession: (session) => {
    saveStoredSession(session);

    set({
      token: session.token,
      user: session.user,
      hydrated: true,
    });
  },
  logout: () => {
    clearStoredSession();

    set({
      token: null,
      user: null,
      hydrated: true,
    });
  },
}));
