import {
  getAgentDeploymentGeneratePath,
  getAgentDeploymentPath,
  getPublicAgentExecutePath,
  getPublicWebhookPath,
  getPublicWidgetChatPath,
  getPublicWidgetConfigPath,
} from "./constants";
import { apiClient } from "./apiClient";
import type {
  ChatMessage,
  DeploymentSettings,
  ExecuteAgentStreamRequest,
  JsonObject,
  WidgetConfig,
} from "./types";

export interface PublicExecutionResponse {
  message: ChatMessage;
  executionId?: string;
}

export interface PublicWebhookResponse {
  accepted: boolean;
  executionId?: string;
  message?: string;
}

export const updateDeploymentSettings = (
  agentId: string,
  deployment: DeploymentSettings,
) =>
  apiClient.put<DeploymentSettings, DeploymentSettings>(
    getAgentDeploymentPath(agentId),
    deployment,
  );

export const generateDeploymentSettings = (agentId: string) =>
  apiClient.post<undefined, DeploymentSettings>(
    getAgentDeploymentGeneratePath(agentId),
    undefined,
  );

export const executePublicAgent = (
  deploymentSlug: string,
  request: ExecuteAgentStreamRequest,
) =>
  apiClient.post<ExecuteAgentStreamRequest, PublicExecutionResponse>(
    getPublicAgentExecutePath(deploymentSlug),
    request,
  );

export const executePublicWidgetChat = (
  deploymentSlug: string,
  request: ExecuteAgentStreamRequest,
) =>
  apiClient.post<ExecuteAgentStreamRequest, PublicExecutionResponse>(
    getPublicWidgetChatPath(deploymentSlug),
    request,
  );

export const postPublicWebhook = (
  deploymentSlug: string,
  payload: JsonObject,
) =>
  apiClient.post<JsonObject, PublicWebhookResponse>(
    getPublicWebhookPath(deploymentSlug),
    payload,
  );

export const getWidgetConfig = (deploymentSlug: string) =>
  apiClient.get<WidgetConfig>(getPublicWidgetConfigPath(deploymentSlug));
