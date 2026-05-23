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

type BackendChatMessage = Omit<ChatMessage, "role"> & {
  role: ChatMessage["role"] | Uppercase<ChatMessage["role"]>;
};

const normalizeMessageRole = (
  role: BackendChatMessage["role"],
): ChatMessage["role"] => {
  const normalizedRole = role.toLowerCase();

  if (
    normalizedRole === "user" ||
    normalizedRole === "assistant" ||
    normalizedRole === "system" ||
    normalizedRole === "tool"
  ) {
    return normalizedRole;
  }

  return "assistant";
};

const normalizeChatMessage = (message: BackendChatMessage): ChatMessage => ({
  ...message,
  role: normalizeMessageRole(message.role),
});

export const listSessionMessages = (sessionId: string) =>
  apiClient
    .get<BackendChatMessage[]>(getSessionMessagesPath(sessionId))
    .then((messages) => messages.map(normalizeChatMessage));

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
