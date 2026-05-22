import { LIVE_TRACKING_EVENT_NAMES } from "../lib/constants";
import type {
  ApiErrorShape,
  ChatMessage,
  ChatSession,
  ExecutionStatus,
  JsonObject,
  JsonValue,
  LiveTrackingEvent,
  LiveTrackingEventName,
  ToolRunStatus,
} from "../lib/types";

export interface ExecutionStoreState {
  session?: ChatSession;
  messages: ChatMessage[];
  executionEvents: LiveTrackingEvent[];
  streamedMessage: string;
  isStreaming: boolean;
  isThinking: boolean;
  error?: ApiErrorShape;
}

type Listener = () => void;
type ExecutionStoreUpdater =
  | Partial<ExecutionStoreState>
  | ((state: ExecutionStoreState) => ExecutionStoreState);

const listeners = new Set<Listener>();

let state: ExecutionStoreState = {
  messages: [],
  executionEvents: [],
  streamedMessage: "",
  isStreaming: false,
  isThinking: false,
};

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isJsonValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

const isJsonObject = (value: unknown): value is JsonObject =>
  isRecord(value) && Object.values(value).every(isJsonValue);

const readString = (
  source: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
};

const readNumber = (
  source: Record<string, unknown>,
  keys: string[],
): number | undefined => {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return undefined;
};

const isKnownEventName = (eventName: string): eventName is LiveTrackingEventName =>
  LIVE_TRACKING_EVENT_NAMES.some((knownName) => knownName === eventName);

const readStatus = (
  source: Record<string, unknown>,
): ExecutionStatus | ToolRunStatus => {
  const status = readString(source, ["status"])?.toLowerCase();

  if (
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "blocked" ||
    status === "waiting_for_human" ||
    status === "idle"
  ) {
    return status;
  }

  return "running";
};

export const getExecutionStoreSnapshot = () => state;

export const subscribeExecutionStore = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setExecutionStoreState = (updater: ExecutionStoreUpdater) => {
  state =
    typeof updater === "function"
      ? updater(state)
      : {
          ...state,
          ...updater,
        };

  emitChange();
};

export const normalizeLiveTrackingEvent = (
  eventName: string,
  eventData: unknown,
): LiveTrackingEvent => {
  const source = isRecord(eventData) ? eventData : {};
  const timestamp =
    readString(source, ["timestamp", "createdAt"]) ?? new Date().toISOString();
  const summary =
    readString(source, ["summary", "message", "errorMessage"]) ??
    `Received ${eventName} event.`;

  return {
    id: readString(source, ["id", "eventId"]),
    executionId: readString(source, ["executionId", "execution_id"]),
    type: isKnownEventName(eventName)
      ? eventName
      : readString(source, ["type", "eventName"]) ?? eventName,
    stepNumber: readNumber(source, ["stepNumber", "step", "stepIndex", "step_index"]),
    summary,
    toolName: readString(source, ["toolName", "tool_name", "tool"]),
    status: readStatus(source),
    timestamp,
    input: isJsonValue(source.input)
      ? source.input
      : isJsonValue(source.args)
        ? source.args
        : undefined,
    output: isJsonValue(source.output)
      ? source.output
      : isJsonValue(source.result)
        ? source.result
        : undefined,
    errorMessage: readString(source, ["errorMessage", "error"]),
    raw: isJsonObject(eventData) ? eventData : undefined,
  };
};

export const extractMessageDelta = (eventData: unknown): string | undefined => {
  if (!isRecord(eventData)) {
    return undefined;
  }

  const directDelta = readString(eventData, ["delta", "content"]);

  if (directDelta) {
    return directDelta;
  }

  const output = eventData.output;

  if (!isRecord(output)) {
    return undefined;
  }

  return readString(output, ["delta", "content"]);
};

export const extractFinalMessage = (eventData: unknown): string | undefined => {
  if (!isRecord(eventData)) {
    return undefined;
  }

  const directMessage = readString(eventData, [
    "finalMessage",
    "answer",
    "content",
  ]);

  if (directMessage) {
    return directMessage;
  }

  const output = eventData.output;

  if (!isRecord(output)) {
    return undefined;
  }

  return readString(output, ["finalMessage", "answer", "content"]);
};

export const executionStoreActions = {
  setSession: (session?: ChatSession) => {
    setExecutionStoreState({ session });
  },

  setMessages: (messages: ChatMessage[]) => {
    setExecutionStoreState({ messages });
  },

  appendMessage: (message: ChatMessage) => {
    setExecutionStoreState((currentState) => ({
      ...currentState,
      messages: [...currentState.messages, message],
    }));
  },

  addExecutionEvent: (event: LiveTrackingEvent) => {
    setExecutionStoreState((currentState) => ({
      ...currentState,
      executionEvents: [...currentState.executionEvents, event],
    }));
  },

  clearExecutionEvents: () => {
    setExecutionStoreState({
      executionEvents: [],
      streamedMessage: "",
      error: undefined,
    });
  },

  appendStreamedMessage: (delta: string) => {
    setExecutionStoreState((currentState) => ({
      ...currentState,
      streamedMessage: `${currentState.streamedMessage}${delta}`,
    }));
  },

  setStreamingState: (isStreaming: boolean, isThinking = isStreaming) => {
    setExecutionStoreState({ isStreaming, isThinking });
  },

  setError: (error?: ApiErrorShape) => {
    setExecutionStoreState({ error });
  },
};
