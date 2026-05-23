"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, useRef } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as agentsApi from "../lib/agentsApi";
import * as mockApi from "../lib/mockApi";
import type { AgentDraft, ApiErrorShape } from "../lib/types";
import {
  agentStoreActions,
  getAgentStoreSnapshot,
  subscribeAgentStore,
} from "../store/agentStore";

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected API error.",
});

export const useAgents = () => {
  const state = useSyncExternalStore(
    subscribeAgentStore,
    getAgentStoreSnapshot,
    getAgentStoreSnapshot,
  );

  const selectedAgent = useMemo(
    () => state.agents.find((agent) => agent.id === state.selectedAgentId),
    [state.agents, state.selectedAgentId],
  );

  const refreshAgents = useCallback(async () => {
    agentStoreActions.setLoading(true);
    agentStoreActions.setError(undefined);

    try {
      const agents = USE_MOCK_API
        ? await mockApi.listAgents()
        : await agentsApi.listAgents();

      agentStoreActions.setAgents(agents);
      return agents;
    } catch (error) {
      agentStoreActions.setError(toApiError(error));
      return [];
    } finally {
      agentStoreActions.setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (draft: AgentDraft) => {
    agentStoreActions.setLoading(true);
    agentStoreActions.setError(undefined);

    try {
      const agent = USE_MOCK_API
        ? await mockApi.createAgent(draft)
        : await agentsApi.createAgent(draft);

      agentStoreActions.upsertAgent(agent);
      agentStoreActions.selectAgent(agent.id);
      return agent;
    } catch (error) {
      const apiError = toApiError(error);
      agentStoreActions.setError(apiError);
      throw apiError;
    } finally {
      agentStoreActions.setLoading(false);
    }
  }, []);

  const updateAgent = useCallback(async (agentId: string, draft: AgentDraft) => {
    agentStoreActions.setLoading(true);
    agentStoreActions.setError(undefined);

    try {
      const agent = USE_MOCK_API
        ? await mockApi.updateAgent(agentId, draft)
        : await agentsApi.updateAgent(agentId, draft);

      agentStoreActions.upsertAgent(agent);
      return agent;
    } catch (error) {
      const apiError = toApiError(error);
      agentStoreActions.setError(apiError);
      throw apiError;
    } finally {
      agentStoreActions.setLoading(false);
    }
  }, []);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (state.agents.length === 0 && !state.isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true;
      void refreshAgents();
    }
  }, [refreshAgents, state.agents.length, state.isLoading]);

  return {
    agents: state.agents,
    selectedAgent,
    selectedAgentId: state.selectedAgentId,
    isLoading: state.isLoading,
    error: state.error,
    refreshAgents,
    createAgent,
    updateAgent,
    selectAgent: agentStoreActions.selectAgent,
  };
};
