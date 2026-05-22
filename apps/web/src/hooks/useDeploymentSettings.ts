"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as deploymentsApi from "../lib/deploymentsApi";
import * as mockApi from "../lib/mockApi";
import type {
  ApiErrorShape,
  DeploymentSettings,
  WidgetConfig,
} from "../lib/types";
import {
  agentStoreActions,
  getAgentStoreSnapshot,
  subscribeAgentStore,
} from "../store/agentStore";

const toApiError = (error: unknown): ApiErrorShape => ({
  message:
    error instanceof Error ? error.message : "Unexpected deployment error.",
});

export const useDeploymentSettings = (agentId?: string) => {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorShape>();
  const agentState = useSyncExternalStore(
    subscribeAgentStore,
    getAgentStoreSnapshot,
    getAgentStoreSnapshot,
  );

  const selectedAgent = useMemo(
    () =>
      agentState.agents.find(
        (agent) => agent.id === (agentId ?? agentState.selectedAgentId),
      ),
    [agentId, agentState.agents, agentState.selectedAgentId],
  );

  const updateDeployment = useCallback(
    async (deployment: DeploymentSettings) => {
      if (!selectedAgent) {
        throw new Error("Select an agent before updating deployment settings.");
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const updatedDeployment = USE_MOCK_API
          ? await mockApi.updateDeploymentSettings(selectedAgent.id, deployment)
          : await deploymentsApi.updateDeploymentSettings(
              selectedAgent.id,
              deployment,
            );

        agentStoreActions.upsertAgent({
          ...selectedAgent,
          deployment: updatedDeployment,
          updatedAt: new Date().toISOString(),
        });

        return updatedDeployment;
      } catch (caughtError) {
        const apiError = toApiError(caughtError);
        setError(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAgent],
  );

  const loadWidgetConfig = useCallback(
    async (deploymentSlug = selectedAgent?.deployment.deploymentSlug) => {
      if (!deploymentSlug) {
        return undefined;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const config = USE_MOCK_API
          ? await mockApi.getWidgetConfig(deploymentSlug)
          : await deploymentsApi.getWidgetConfig(deploymentSlug);

        setWidgetConfig(config);
        return config;
      } catch (caughtError) {
        const apiError = toApiError(caughtError);
        setError(apiError);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAgent?.deployment.deploymentSlug],
  );

  return {
    deploymentSettings: selectedAgent?.deployment,
    widgetConfig,
    isLoading,
    error,
    updateDeployment,
    loadWidgetConfig,
  };
};
