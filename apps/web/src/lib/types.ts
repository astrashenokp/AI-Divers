import { LIVE_TRACKING_EVENT_NAMES } from "./constants";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  readonly [key: string]: JsonValue;
};

export type AgentStatus = "draft" | "active" | "archived";

export type ToolTypeKey = "web_search" | "http_request" | "database_query";

export type ToolCategoryId = "education" | "stores" | "tourism" | "finance";

export type ToolRunStatus = "idle" | "running" | "completed" | "failed";

export type ExecutionStatus =
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "waiting_for_human";

export type ChatMessageRole = "user" | "assistant" | "system" | "tool";

export type ChatSessionSource = "STUDIO" | "REST_API" | "WEBHOOK" | "WIDGET";

export type DeploymentSurface = "rest_api" | "webhook" | "widget";

export type LiveTrackingEventName = (typeof LIVE_TRACKING_EVENT_NAMES)[number];

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  status: AgentStatus;
  tools: AgentTool[];
  guardrails: GuardrailConfig;
  deployment: DeploymentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDraft {
  name: string;
  description: string;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  status?: AgentStatus;
  tools?: AgentTool[];
  guardrails?: GuardrailConfig;
  deployment?: DeploymentSettings;
}

export interface AgentTool {
  id: string;
  agentId?: string;
  type: ToolTypeKey | string;
  category?: ToolCategoryId | string;
  name: string;
  enabled: boolean;
  config: JsonObject;
  createdAt?: string;
  updatedAt?: string;
}

export interface ToolType {
  type: ToolTypeKey | string;
  category?: ToolCategoryId | string;
  displayName: string;
  description: string;
  configSchema?: JsonObject;
  requiresSecret?: boolean;
}

export interface ToolTemplate {
  type: ToolTypeKey | string;
  name: string;
  description: string;
  category?: ToolCategoryId | string;
  requiresHumanConfirmation: boolean;
  configSchema?: JsonObject;
  requiresSecret?: boolean;
}

export interface ToolCategory {
  id: ToolCategoryId | string;
  label: string;
  description: string;
  tools: ToolTemplate[];
}

export interface ToolTypesResponse {
  categories: ToolCategory[];
}

export interface GuardrailConfig {
  maxSteps: number;
  forbiddenTopics: string[];
  requireHumanConfirmationForTools: string[];
}

export interface ChatSession {
  id: string;
  agentId: string;
  source: ChatSessionSource;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  metadata?: JsonObject;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  sessionId?: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface LiveTrackingEvent {
  id?: string;
  executionId?: string;
  type: LiveTrackingEventName | string;
  stepNumber?: number;
  summary: string;
  toolName?: string;
  status: ExecutionStatus | ToolRunStatus;
  timestamp: string;
  input?: JsonValue;
  output?: JsonValue;
  errorMessage?: string;
  raw?: JsonObject;
}

export interface DeploymentSettings {
  agentId?: string;
  deploymentSlug: string;
  restEnabled: boolean;
  webhookEnabled: boolean;
  widgetEnabled: boolean;
  publicAccessEnabled: boolean;
  widgetIframeCode?: string;
  updatedAt?: string;
}

export interface WidgetConfig {
  deploymentSlug: string;
  agentName: string;
  welcomeMessage: string;
  primaryColor?: string;
  allowedOrigins?: string[];
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  code?: string;
  details?: JsonValue;
  path?: string;
  timestamp?: string;
}

export interface BackendHealthResponse {
  status: string;
  service?: string;
  version?: string;
  timestamp?: string;
}

export interface ExecuteAgentStreamRequest {
  sessionId?: string;
  message: string;
  metadata?: JsonObject;
}

export interface StreamEventHandlers<TEventData = unknown> {
  onEvent?: (eventName: LiveTrackingEventName | string, eventData: TEventData) => void;
  onError?: (error: ApiErrorShape) => void;
  onDone?: () => void;
}
