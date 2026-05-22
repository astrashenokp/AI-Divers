import { AGENTS_PATH, getAgentPath } from "./constants";
import { apiClient } from "./apiClient";
import type { Agent, AgentDraft } from "./types";

export const listAgents = () => apiClient.get<Agent[]>(AGENTS_PATH);

export const createAgent = (draft: AgentDraft) =>
  apiClient.post<AgentDraft, Agent>(AGENTS_PATH, draft);

export const getAgent = (agentId: string) =>
  apiClient.get<Agent>(getAgentPath(agentId));

export const updateAgent = (agentId: string, draft: AgentDraft) =>
  apiClient.put<AgentDraft, Agent>(getAgentPath(agentId), draft);
