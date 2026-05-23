import type { AuthSession } from "./types";

const AUTH_STORAGE_KEY = "agentic-studio.auth";

type AuthListener = () => void;

const listeners = new Set<AuthListener>();
let cachedSession: AuthSession | null | undefined;

const canUseStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readStoredSession = (): AuthSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<AuthSession>;

    if (
      typeof parsedValue.token !== "string" ||
      typeof parsedValue.tokenType !== "string" ||
      typeof parsedValue.username !== "string"
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return {
      token: parsedValue.token,
      tokenType: parsedValue.tokenType,
      username: parsedValue.username,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const emitAuthChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const getAuthSession = () => {
  if (cachedSession === undefined) {
    cachedSession = readStoredSession();
  }

  return cachedSession;
};

export const getAuthToken = () => getAuthSession()?.token;

export const getAuthorizationHeader = (): HeadersInit => {
  const session = getAuthSession();

  if (!session?.token) {
    return {};
  }

  return {
    Authorization: `${session.tokenType || "Bearer"} ${session.token}`,
  };
};

export const setAuthSession = (session: AuthSession) => {
  cachedSession = session;

  if (canUseStorage()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  emitAuthChange();
};

export const clearAuthSession = () => {
  cachedSession = null;

  if (canUseStorage()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  emitAuthChange();
};

export const subscribeAuthSession = (listener: AuthListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
