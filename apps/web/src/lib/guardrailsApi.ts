import { getAgentGuardrailsPath } from "./constants";
import { apiClient } from "./apiClient";
import type { GuardrailConfig } from "./types";

export const updateGuardrails = (
  agentId: string,
  guardrails: GuardrailConfig,
) =>
  apiClient.put<GuardrailConfig, GuardrailConfig>(
    getAgentGuardrailsPath(agentId),
    guardrails,
  );
