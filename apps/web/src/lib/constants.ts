export const APP_TITLE = "Agentic Studio";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const API_V1_PREFIX = "/api/v1";

export const HEALTH_PATH = `${API_V1_PREFIX}/health`;
export const AGENTS_PATH = `${API_V1_PREFIX}/agents`;
export const TOOL_TYPES_PATH = `${API_V1_PREFIX}/tool-types`;
export const SESSIONS_PATH = `${API_V1_PREFIX}/sessions`;
export const PUBLIC_AGENTS_PATH = `${API_V1_PREFIX}/public/agents`;
export const PUBLIC_WEBHOOKS_PATH = `${API_V1_PREFIX}/public/webhooks`;
export const PUBLIC_WIDGETS_PATH = `${API_V1_PREFIX}/public/widgets`;

export const getAgentPath = (agentId: string) => `${AGENTS_PATH}/${agentId}`;

export const getAgentToolsPath = (agentId: string) =>
  `${getAgentPath(agentId)}/tools`;

export const getAgentGuardrailsPath = (agentId: string) =>
  `${getAgentPath(agentId)}/guardrails`;

export const getAgentSessionsPath = (agentId: string) =>
  `${getAgentPath(agentId)}/sessions`;

export const getAgentExecutionStreamPath = (agentId: string) =>
  `${getAgentPath(agentId)}/execute/stream`;

export const getSessionMessagesPath = (sessionId: string) =>
  `${SESSIONS_PATH}/${sessionId}/messages`;

export const getAgentDeploymentPath = (agentId: string) =>
  `${getAgentPath(agentId)}/deployment`;

export const getPublicAgentExecutePath = (deploymentSlug: string) =>
  `${PUBLIC_AGENTS_PATH}/${deploymentSlug}/execute`;

export const getPublicWebhookPath = (deploymentSlug: string) =>
  `${PUBLIC_WEBHOOKS_PATH}/${deploymentSlug}`;

export const getPublicWidgetConfigPath = (deploymentSlug: string) =>
  `${PUBLIC_WIDGETS_PATH}/${deploymentSlug}/config`;

export const LIVE_TRACKING_EVENTS = {
  EXECUTION_STARTED: "execution_started",
  REASONING_STEP: "reasoning_step",
  TOOL_CALL_STARTED: "tool_call_started",
  TOOL_CALL_FINISHED: "tool_call_finished",
  GUARDRAIL_BLOCKED: "guardrail_blocked",
  HUMAN_CONFIRMATION_REQUIRED: "human_confirmation_required",
  MESSAGE_DELTA: "message_delta",
  EXECUTION_COMPLETED: "execution_completed",
  EXECUTION_FAILED: "execution_failed",
} as const;

export const LIVE_TRACKING_EVENT_NAMES = [
  LIVE_TRACKING_EVENTS.EXECUTION_STARTED,
  LIVE_TRACKING_EVENTS.REASONING_STEP,
  LIVE_TRACKING_EVENTS.TOOL_CALL_STARTED,
  LIVE_TRACKING_EVENTS.TOOL_CALL_FINISHED,
  LIVE_TRACKING_EVENTS.GUARDRAIL_BLOCKED,
  LIVE_TRACKING_EVENTS.HUMAN_CONFIRMATION_REQUIRED,
  LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
  LIVE_TRACKING_EVENTS.EXECUTION_COMPLETED,
  LIVE_TRACKING_EVENTS.EXECUTION_FAILED,
] as const;
