"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as mockApi from "../lib/mockApi";
import * as sessionsApi from "../lib/sessionsApi";
import type { ApiErrorShape, ChatSession } from "../lib/types";
import {
  executionStoreActions,
  getExecutionStoreSnapshot,
  subscribeExecutionStore,
} from "../store/executionStore";

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected session error.",
});

const ACTIVE_SESSIONS_STORAGE_KEY = "agentic-studio.active-sessions";

const canUseStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readStoredSessions = (): Record<string, string> => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(ACTIVE_SESSIONS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (typeof parsedValue !== "object" || parsedValue === null || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    );
  } catch {
    window.localStorage.removeItem(ACTIVE_SESSIONS_STORAGE_KEY);
    return {};
  }
};

const getStoredSessionId = (agentId: string) => readStoredSessions()[agentId];

const setStoredSessionId = (agentId: string, sessionId: string) => {
  if (!canUseStorage()) {
    return;
  }

  const storedSessions = readStoredSessions();
  window.localStorage.setItem(
    ACTIVE_SESSIONS_STORAGE_KEY,
    JSON.stringify({
      ...storedSessions,
      [agentId]: sessionId,
    }),
  );
};

const removeStoredSessionId = (agentId: string) => {
  if (!canUseStorage()) {
    return;
  }

  const storedSessions = readStoredSessions();
  delete storedSessions[agentId];
  window.localStorage.setItem(
    ACTIVE_SESSIONS_STORAGE_KEY,
    JSON.stringify(storedSessions),
  );
};

const createRestoredSession = (agentId: string, sessionId: string): ChatSession => ({
  id: sessionId,
  agentId,
  source: "STUDIO",
  title: "Restored chat",
  createdAt: new Date().toISOString(),
});

export const useAgentSession = (agentId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const restoredAgentIdRef = useRef<string | undefined>(undefined);
  const state = useSyncExternalStore(
    subscribeExecutionStore,
    getExecutionStoreSnapshot,
    getExecutionStoreSnapshot,
  );

  const startSession = useCallback(
    async (title?: string) => {
      if (!agentId) {
        throw new Error("Select an agent before starting a session.");
      }

      executionStoreActions.setError(undefined);
      setIsLoading(true);

      try {
        const session = USE_MOCK_API
          ? await mockApi.createAgentSession(agentId)
          : await sessionsApi.createAgentSession(agentId, { title });

        executionStoreActions.setSession(session);
        executionStoreActions.setMessages([]);
        executionStoreActions.clearExecutionEvents();
        setStoredSessionId(agentId, session.id);
        return session;
      } catch (error) {
        const apiError = toApiError(error);
        executionStoreActions.setError(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [agentId],
  );

  useEffect(() => {
    if (!agentId || restoredAgentIdRef.current === agentId) {
      return;
    }

    restoredAgentIdRef.current = agentId;
    const storedSessionId = getStoredSessionId(agentId);

    if (!storedSessionId) {
      return;
    }

    let isCancelled = false;
    const restoredSession = createRestoredSession(agentId, storedSessionId);

    executionStoreActions.setError(undefined);
    executionStoreActions.setSession(restoredSession);
    executionStoreActions.clearExecutionEvents();

    const restoreMessages = async () => {
      setIsLoading(true);

      try {
        const messages = USE_MOCK_API
          ? await mockApi.listSessionMessages(storedSessionId)
          : await sessionsApi.listSessionMessages(storedSessionId);

        if (!isCancelled) {
          executionStoreActions.setMessages(messages);
        }
      } catch {
        if (!isCancelled) {
          removeStoredSessionId(agentId);
          executionStoreActions.setSession(undefined);
          executionStoreActions.setMessages([]);
          executionStoreActions.clearExecutionEvents();
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void restoreMessages();

    return () => {
      isCancelled = true;
    };
  }, [agentId]);

  const refreshMessages = useCallback(
    async (sessionId = state.session?.id) => {
      if (!sessionId) {
        return [];
      }

      executionStoreActions.setError(undefined);
      setIsLoading(true);

      try {
        const messages = USE_MOCK_API
          ? await mockApi.listSessionMessages(sessionId)
          : await sessionsApi.listSessionMessages(sessionId);

        executionStoreActions.setMessages(messages);
        return messages;
      } catch (error) {
        executionStoreActions.setError(toApiError(error));
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [state.session?.id],
  );

  return {
    session: state.session,
    messages: state.messages,
    isLoading,
    error: state.error,
    startSession,
    refreshMessages,
  };
};
