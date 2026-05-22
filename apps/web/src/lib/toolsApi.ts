import { TOOL_TYPES_PATH, getAgentToolsPath } from "./constants";
import { apiClient } from "./apiClient";
import type { AgentTool, ToolTypesResponse } from "./types";

export type AttachToolRequest = Omit<
  AgentTool,
  "id" | "agentId" | "createdAt" | "updatedAt"
>;

export const listToolTypes = () =>
  apiClient.get<ToolTypesResponse>(TOOL_TYPES_PATH);

export const attachToolToAgent = (
  agentId: string,
  tool: AttachToolRequest,
) => apiClient.post<AttachToolRequest, AgentTool>(getAgentToolsPath(agentId), tool);
