import { buildApiUrl } from "./apiClient";
import { getAuthorizationHeader } from "./authSession";
import type { ApiErrorShape, StreamEventHandlers } from "./types";

export interface PostSseStreamOptions<TRequestBody> {
  path: string;
  body: TRequestBody;
  handlers: StreamEventHandlers<unknown>;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

interface ParsedSseBlock {
  eventName: string;
  data: unknown;
}

const createStreamError = (
  message: string,
  status?: number,
  details?: unknown,
): ApiErrorShape => ({
  message,
  status,
  details:
    typeof details === "string" ||
    typeof details === "number" ||
    typeof details === "boolean" ||
    details === null ||
    Array.isArray(details) ||
    (typeof details === "object" && details !== null)
      ? (details as ApiErrorShape["details"])
      : undefined,
});

const parseSseData = (rawData: string): unknown => {
  if (!rawData.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawData) as unknown;
  } catch {
    return { message: rawData };
  }
};

const parseSseBlock = (block: string): ParsedSseBlock | null => {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  let eventName = "message";

  for (const line of lines) {
    if (!line.trim() || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "event") {
      eventName = value;
    }

    if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0 && eventName === "message") {
    return null;
  }

  return {
    eventName,
    data: parseSseData(dataLines.join("\n")),
  };
};

const emitCompleteBlocks = (
  buffer: string,
  handlers: StreamEventHandlers<unknown>,
): string => {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    const parsed = parseSseBlock(block);

    if (parsed) {
      handlers.onEvent?.(parsed.eventName, parsed.data);
    }
  }

  return remainder;
};

export async function connectPostSseStream<TRequestBody>({
  path,
  body,
  handlers,
  signal,
  headers,
}: PostSseStreamOptions<TRequestBody>): Promise<void> {
  try {
    const response = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...getAuthorizationHeader(),
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      handlers.onError?.(
        createStreamError(
          `Stream request failed with status ${response.status}`,
          response.status,
        ),
      );
      handlers.onDone?.();
      return;
    }

    if (!response.body) {
      handlers.onError?.(createStreamError("Stream response body is empty"));
      handlers.onDone?.();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = emitCompleteBlocks(buffer, handlers);
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer);

      if (parsed) {
        handlers.onEvent?.(parsed.eventName, parsed.data);
      }
    }

    handlers.onDone?.();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      handlers.onDone?.();
      return;
    }

    handlers.onError?.(
      createStreamError(
        error instanceof Error ? error.message : "Unexpected stream error",
      ),
    );
    handlers.onDone?.();
  }
}
