import { DOMAINS_PATH, GUARDRAILS_CONFIG_PATH } from "./constants";
import { apiClient } from "./apiClient";
import type { DomainsResponse, GuardrailsConfigResponse } from "./types";

export const listDomains = () =>
  apiClient.get<DomainsResponse>(DOMAINS_PATH);

export const getGuardrailsConfig = () =>
  apiClient.get<GuardrailsConfigResponse>(GUARDRAILS_CONFIG_PATH);
