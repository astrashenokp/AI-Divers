"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as agentsApi from "../lib/agentsApi";
import * as guardrailsApi from "../lib/guardrailsApi";
import * as mockApi from "../lib/mockApi";
import * as toolsApi from "../lib/toolsApi";
import type {
  AgentDraft,
  AgentTool,
  ApiErrorShape,
  GuardrailConfig,
  ToolTypesResponse,
} from "../lib/types";
import {
  agentStoreActions,
  getAgentStoreSnapshot,
  subscribeAgentStore,
} from "../store/agentStore";

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected builder error.",
});

const emptyToolTypesResponse: ToolTypesResponse = {
  categories: [],
};

export const useAgentBuilder = (agentId?: string) => {
  const state = useSyncExternalStore(
    subscribeAgentStore,
    getAgentStoreSnapshot,
    getAgentStoreSnapshot,
  );

  const selectedAgent = useMemo(
    () =>
      state.agents.find((agent) => agent.id === (agentId ?? state.selectedAgentId)),
    [agentId, state.agents, state.selectedAgentId],
  );

  const refreshToolTypes = useCallback(async () => {
    agentStoreActions.setLoading(true);
    agentStoreActions.setError(undefined);

    try {
      const toolTypes = USE_MOCK_API
        ? await mockApi.listToolTypes()
        : await toolsApi.listToolTypes();

      agentStoreActions.setToolTypes(toolTypes);
      return toolTypes;
    } catch (error) {
      agentStoreActions.setError(toApiError(error));
      return emptyToolTypesResponse;
    } finally {
      agentStoreActions.setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(
    async (draft: AgentDraft) => {
      agentStoreActions.setLoading(true);
      agentStoreActions.setError(undefined);

      try {
        const agent = selectedAgent
          ? USE_MOCK_API
            ? await mockApi.updateAgent(selectedAgent.id, draft)
            : await agentsApi.updateAgent(selectedAgent.id, draft)
          : USE_MOCK_API
            ? await mockApi.createAgent(draft)
            : await agentsApi.createAgent(draft);

        agentStoreActions.upsertAgent(agent);
        agentStoreActions.selectAgent(agent.id);
        agentStoreActions.setAgentDraft(undefined);
        return agent;
      } catch (error) {
        const apiError = toApiError(error);
        agentStoreActions.setError(apiError);
        throw apiError;
      } finally {
        agentStoreActions.setLoading(false);
      }
    },
    [selectedAgent],
  );

  const attachTool = useCallback(
    async (
      tool: Omit<AgentTool, "id" | "agentId" | "createdAt" | "updatedAt">,
    ) => {
      if (!selectedAgent) {
        throw new Error("Select an agent before attaching a tool.");
      }

      agentStoreActions.setLoading(true);
      agentStoreActions.setError(undefined);

      try {
        const attachedTool = USE_MOCK_API
          ? await mockApi.attachToolToAgent(selectedAgent.id, tool)
          : await toolsApi.attachToolToAgent(selectedAgent.id, tool);

        agentStoreActions.upsertAgent({
          ...selectedAgent,
          tools: [...selectedAgent.tools, attachedTool],
          updatedAt: new Date().toISOString(),
        });

        return attachedTool;
      } catch (error) {
        const apiError = toApiError(error);
        agentStoreActions.setError(apiError);
        throw apiError;
      } finally {
        agentStoreActions.setLoading(false);
      }
    },
    [selectedAgent],
  );

  const updateGuardrails = useCallback(
    async (guardrails: GuardrailConfig) => {
      if (!selectedAgent) {
        throw new Error("Select an agent before updating guardrails.");
      }

      agentStoreActions.setLoading(true);
      agentStoreActions.setError(undefined);

      try {
        const updatedGuardrails = USE_MOCK_API
          ? await mockApi.updateGuardrails(selectedAgent.id, guardrails)
          : await guardrailsApi.updateGuardrails(selectedAgent.id, guardrails);

        agentStoreActions.setGuardrails(updatedGuardrails);
        agentStoreActions.upsertAgent({
          ...selectedAgent,
          guardrails: updatedGuardrails,
          updatedAt: new Date().toISOString(),
        });

        return updatedGuardrails;
      } catch (error) {
        const apiError = toApiError(error);
        agentStoreActions.setError(apiError);
        throw apiError;
      } finally {
        agentStoreActions.setLoading(false);
      }
    },
    [selectedAgent],
  );

  return {
    selectedAgent,
    agentDraft: state.agentDraft,
    toolTypes: state.toolTypes,
    toolCategories: state.toolTypes.categories,
    guardrails: state.guardrails ?? selectedAgent?.guardrails,
    isLoading: state.isLoading,
    error: state.error,
    setAgentDraft: agentStoreActions.setAgentDraft,
    refreshToolTypes,
    saveDraft,
    attachTool,
    updateGuardrails,
  };
};
