/**
 * api.ts — єдина точка входу для всіх API-викликів у проєкті.
 *
 * Правило: завжди імпортуй функції звідси, а не напряму з agentsApi.ts,
 * toolsApi.ts тощо. Це забезпечує автоматичне перемикання між мок-режимом
 * і реальним бекендом через змінну NEXT_PUBLIC_USE_MOCK_API.
 */

import { USE_MOCK_API } from "./constants";

// ─── Real API modules ────────────────────────────────────────────────────────
import * as realAgentsApi from "./agentsApi";
import * as realToolsApi from "./toolsApi";
import * as realGuardrailsApi from "./guardrailsApi";
import * as realSessionsApi from "./sessionsApi";
import * as realDeploymentsApi from "./deploymentsApi";
import * as realRuntimeApi from "./runtimeApi";
import { checkBackendReachable, getBackendHealth } from "./healthApi";

// ─── Mock API module ──────────────────────────────────────────────────────────
import * as mockApi from "./mockApi";

// ─── Types ────────────────────────────────────────────────────────────────────
import type {
  Agent,
  AgentDraft,
  AgentTool,
  ChatMessage,
  ChatSession,
  DeploymentSettings,
  DomainsResponse,
  GuardrailConfig,
  GuardrailsConfigResponse,
  LiveTrackingEvent,
  StreamEventHandlers,
  ToolTypesResponse,
  WidgetConfig,
} from "./types";
import type { AttachToolRequest } from "./toolsApi";
import type { CreateAgentSessionRequest } from "./sessionsApi";
import type { ExecuteAgentStreamRequest } from "./types";

// ─── Agents ──────────────────────────────────────────────────────────────────

export const listAgents = (): Promise<Agent[]> =>
  USE_MOCK_API ? mockApi.listAgents() : realAgentsApi.listAgents();

export const createAgent = (draft: AgentDraft): Promise<Agent> =>
  USE_MOCK_API
    ? mockApi.createAgent(draft)
    : realAgentsApi.createAgent(draft);

export const getAgent = (agentId: string): Promise<Agent> =>
  USE_MOCK_API ? mockApi.getAgent(agentId) : realAgentsApi.getAgent(agentId);

export const updateAgent = (agentId: string, draft: AgentDraft): Promise<Agent> =>
  USE_MOCK_API
    ? mockApi.updateAgent(agentId, draft)
    : realAgentsApi.updateAgent(agentId, draft);

// ─── Domains & Guardrails config ─────────────────────────────────────────────

export const listDomains = (): Promise<DomainsResponse> =>
  USE_MOCK_API
    ? mockApi.listDomains()
    : realRuntimeApi.listDomains();

export const getGuardrailsConfig = (): Promise<GuardrailsConfigResponse> =>
  USE_MOCK_API
    ? mockApi.getGuardrailsConfig()
    : realRuntimeApi.getGuardrailsConfig();

// ─── Tool types ───────────────────────────────────────────────────────────────

export const listToolTypes = (): Promise<ToolTypesResponse> =>
  USE_MOCK_API ? mockApi.listToolTypes() : realToolsApi.listToolTypes();

// ─── Attach tool ──────────────────────────────────────────────────────────────

export const attachToolToAgent = (
  agentId: string,
  tool: AttachToolRequest,
): Promise<AgentTool> =>
  USE_MOCK_API
    ? mockApi.attachToolToAgent(agentId, tool)
    : realToolsApi.attachToolToAgent(agentId, tool);

// ─── Guardrails ───────────────────────────────────────────────────────────────

export const updateGuardrails = (
  agentId: string,
  guardrails: GuardrailConfig,
): Promise<GuardrailConfig> =>
  USE_MOCK_API
    ? mockApi.updateGuardrails(agentId, guardrails)
    : realGuardrailsApi.updateGuardrails(agentId, guardrails);

// ─── Sessions & Messages ──────────────────────────────────────────────────────

export const createAgentSession = (
  agentId: string,
  request: CreateAgentSessionRequest = {},
): Promise<ChatSession> =>
  USE_MOCK_API
    ? mockApi.createAgentSession(agentId)
    : realSessionsApi.createAgentSession(agentId, request);

export const listSessionMessages = (sessionId: string): Promise<ChatMessage[]> =>
  USE_MOCK_API
    ? mockApi.listSessionMessages(sessionId)
    : realSessionsApi.listSessionMessages(sessionId);

// ─── Execution stream ─────────────────────────────────────────────────────────

export const streamAgentExecution = (
  agentId: string,
  request: ExecuteAgentStreamRequest,
  handlers: StreamEventHandlers<LiveTrackingEvent>,
  signal?: AbortSignal,
): Promise<void> => {
  if (USE_MOCK_API) {
    return mockApi.runMockAgentExecutionStream(
      agentId,
      request.message,
      handlers,
      signal,
    );
  }

  return realSessionsApi.streamAgentExecution(
    agentId,
    request,
    handlers as StreamEventHandlers<unknown>,
    signal,
  );
};

// ─── Deployment settings & widget config ─────────────────────────────────────

export const updateDeploymentSettings = (
  agentId: string,
  deployment: DeploymentSettings,
): Promise<DeploymentSettings> =>
  USE_MOCK_API
    ? mockApi.updateDeploymentSettings(agentId, deployment)
    : realDeploymentsApi.updateDeploymentSettings(agentId, deployment);

export const generateDeploymentSettings = (
  agentId: string,
): Promise<DeploymentSettings> =>
  USE_MOCK_API
    ? mockApi.generateDeploymentSettings(agentId)
    : realDeploymentsApi.generateDeploymentSettings(agentId);

export const getWidgetConfig = (deploymentSlug: string): Promise<WidgetConfig> =>
  USE_MOCK_API
    ? mockApi.getWidgetConfig(deploymentSlug)
    : realDeploymentsApi.getWidgetConfig(deploymentSlug);

export const executePublicAgent = (
  deploymentSlug: string,
  request: ExecuteAgentStreamRequest,
) =>
  realDeploymentsApi.executePublicAgent(deploymentSlug, request);

export const executePublicWidgetChat = (
  deploymentSlug: string,
  request: ExecuteAgentStreamRequest,
) =>
  realDeploymentsApi.executePublicWidgetChat(deploymentSlug, request);

// ─── Health ───────────────────────────────────────────────────────────────────

export { getBackendHealth, checkBackendReachable };

// ─── Debug helper (dev only) ──────────────────────────────────────────────────

if (process.env.NODE_ENV === "development") {
  console.info(
    `[api.ts] Running in ${USE_MOCK_API ? "🟡 MOCK" : "🟢 REAL"} mode. ` +
      `API base: ${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}`,
  );
}
