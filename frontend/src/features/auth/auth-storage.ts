export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  username: string;
  role: string;
  dependenciaId: number | null;
  subdireccionId: number | null;
  activo: boolean;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const AUTH_STORAGE_KEY = "rat_dnsipd_auth";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveStoredSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
