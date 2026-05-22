import {
  getAgentExecutionStreamPath,
  getAgentSessionsPath,
  getSessionMessagesPath,
} from "./constants";
import { apiClient } from "./apiClient";
import { connectPostSseStream } from "./stream";
import type {
  ChatMessage,
  ChatSession,
  ExecuteAgentStreamRequest,
  StreamEventHandlers,
} from "./types";

export interface CreateAgentSessionRequest {
  title?: string;
}

export const createAgentSession = (
  agentId: string,
  request: CreateAgentSessionRequest = {},
) =>
  apiClient.post<CreateAgentSessionRequest, ChatSession>(
    getAgentSessionsPath(agentId),
    request,
  );

export const listSessionMessages = (sessionId: string) =>
  apiClient.get<ChatMessage[]>(getSessionMessagesPath(sessionId));

export const streamAgentExecution = (
  agentId: string,
  request: ExecuteAgentStreamRequest,
  handlers: StreamEventHandlers<unknown>,
  signal?: AbortSignal,
) =>
  connectPostSseStream({
    path: getAgentExecutionStreamPath(agentId),
    body: request,
    handlers,
    signal,
  });
