import { API_BASE_URL } from "./constants";
import type { ApiErrorShape, JsonObject, JsonValue } from "./types";

export type HttpMethod = "GET" | "POST" | "PUT";

export interface ApiRequestOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiClientError extends Error implements ApiErrorShape {
  status?: number;
  code?: string;
  details?: JsonValue;
  path?: string;
  timestamp?: string;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.path = error.path;
    this.timestamp = error.timestamp;
  }
}

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getStringValue = (source: JsonObject, key: string): string | undefined => {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
};

export const buildApiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text.trim()) {
    return undefined;
  }

  if (!contentType.includes("application/json")) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const createApiError = (
  response: Response,
  payload: unknown,
  path: string,
): ApiClientError => {
  if (isJsonObject(payload)) {
    return new ApiClientError({
      message:
        getStringValue(payload, "message") ??
        getStringValue(payload, "error") ??
        `Request failed with status ${response.status}`,
      status: response.status,
      code: getStringValue(payload, "code"),
      details: payload.details,
      path: getStringValue(payload, "path") ?? path,
      timestamp: getStringValue(payload, "timestamp"),
    });
  }

  return new ApiClientError({
    message:
      typeof payload === "string" && payload.length > 0
        ? payload
        : `Request failed with status ${response.status}`,
    status: response.status,
    path,
  });
};

export async function apiRequest<TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw createApiError(response, payload, path);
  }

  return payload as TResponse;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) =>
    apiRequest<TResponse>("GET", path, undefined, options),

  post: <TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: ApiRequestOptions,
  ) => apiRequest<TResponse>("POST", path, body, options),

  put: <TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: ApiRequestOptions,
  ) => apiRequest<TResponse>("PUT", path, body, options),
};
