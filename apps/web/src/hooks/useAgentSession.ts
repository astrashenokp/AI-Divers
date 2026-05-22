"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as mockApi from "../lib/mockApi";
import * as sessionsApi from "../lib/sessionsApi";
import type { ApiErrorShape } from "../lib/types";
import {
  executionStoreActions,
  getExecutionStoreSnapshot,
  subscribeExecutionStore,
} from "../store/executionStore";

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected session error.",
});

export const useAgentSession = (agentId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
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
