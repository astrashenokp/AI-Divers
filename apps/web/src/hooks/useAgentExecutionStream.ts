"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { LIVE_TRACKING_EVENTS, USE_MOCK_API } from "../lib/constants";
import * as mockApi from "../lib/mockApi";
import * as sessionsApi from "../lib/sessionsApi";
import type {
  ApiErrorShape,
  ChatMessage,
  JsonObject,
  StreamEventHandlers,
} from "../lib/types";
import {
  executionStoreActions,
  extractFinalMessage,
  extractMessageDelta,
  getExecutionStoreSnapshot,
  normalizeLiveTrackingEvent,
  subscribeExecutionStore,
} from "../store/executionStore";

const createLocalMessage = (
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sessionId,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected stream error.",
});

export interface StartExecutionOptions {
  agentId?: string;
  sessionId?: string;
  metadata?: JsonObject;
  forceMock?: boolean;
}

export const useAgentExecutionStream = (agentId?: string, sessionId?: string) => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const state = useSyncExternalStore(
    subscribeExecutionStore,
    getExecutionStoreSnapshot,
    getExecutionStoreSnapshot,
  );

  const stopExecution = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    executionStoreActions.setStreamingState(false, false);
  }, []);

  const startExecution = useCallback(
    async (message: string, options: StartExecutionOptions = {}) => {
      const targetAgentId = options.agentId ?? agentId;

      if (!targetAgentId && !options.forceMock) {
        throw new Error("Select an agent before starting execution.");
      }

      const activeAgentId = targetAgentId ?? "mock-agent-id";

      if (state.isStreaming) {
        stopExecution();
      }

      const activeSessionId =
        options.sessionId ?? sessionId ?? state.session?.id ?? "session-local";
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      executionStoreActions.clearExecutionEvents();
      executionStoreActions.setError(undefined);
      executionStoreActions.setStreamingState(true, true);
      executionStoreActions.appendMessage(
        createLocalMessage(activeSessionId, "user", message),
      );

      const handlers: StreamEventHandlers<unknown> = {
        onEvent: (eventName, eventData) => {
          const normalizedEvent = normalizeLiveTrackingEvent(
            eventName,
            eventData,
          );

          if (eventName !== LIVE_TRACKING_EVENTS.MESSAGE_DELTA) {
            executionStoreActions.addExecutionEvent(normalizedEvent);
          }

          if (eventName === LIVE_TRACKING_EVENTS.MESSAGE_DELTA) {
            const delta = extractMessageDelta(eventData);

            if (delta) {
              executionStoreActions.appendStreamedMessage(delta);
            }
          }

          if (eventName === LIVE_TRACKING_EVENTS.EXECUTION_COMPLETED) {
            const finalMessage =
              extractFinalMessage(eventData) ??
              getExecutionStoreSnapshot().streamedMessage;

            if (finalMessage) {
              executionStoreActions.appendMessage(
                createLocalMessage(activeSessionId, "assistant", finalMessage),
              );
            }
          }
        },
        onError: (error) => {
          executionStoreActions.setError(error);
          executionStoreActions.setStreamingState(false, false);
        },
        onDone: () => {
          abortControllerRef.current = null;
          executionStoreActions.setStreamingState(false, false);
        },
      };

      try {
        if (USE_MOCK_API || options.forceMock) {
          await mockApi.runMockAgentExecutionStream(
            activeAgentId,
            message,
            handlers,
            abortController.signal,
          );
          return;
        }

        await sessionsApi.streamAgentExecution(
          activeAgentId,
          {
            sessionId: activeSessionId,
            message,
            metadata: options.metadata,
          },
          handlers,
          abortController.signal,
        );
      } catch (error) {
        const apiError = toApiError(error);
        executionStoreActions.setError(apiError);
        executionStoreActions.setStreamingState(false, false);
        throw apiError;
      }
    },
    [agentId, sessionId, state.isStreaming, state.session?.id, stopExecution],
  );

  return {
    executionEvents: state.executionEvents,
    messages: state.messages,
    streamedMessage: state.streamedMessage,
    isStreaming: state.isStreaming,
    isThinking: state.isThinking,
    error: state.error,
    startExecution,
    stopExecution,
  };
};
