"use client";

import { useCallback, useEffect, useState } from "react";
import { USE_MOCK_API } from "../lib/constants";
import * as mockApi from "../lib/mockApi";
import * as runtimeApi from "../lib/runtimeApi";
import type {
  ApiErrorShape,
  DomainsResponse,
  GuardrailsConfigResponse,
} from "../lib/types";

const toApiError = (error: unknown): ApiErrorShape => ({
  message:
    error instanceof Error
      ? error.message
      : "Unable to load runtime metadata.",
});

export const useRuntimeMetadata = () => {
  const [domains, setDomains] = useState<DomainsResponse>();
  const [guardrailsConfig, setGuardrailsConfig] =
    useState<GuardrailsConfigResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorShape>();

  const refreshRuntimeMetadata = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [nextDomains, nextGuardrailsConfig] = USE_MOCK_API
        ? await Promise.all([
            mockApi.listDomains(),
            mockApi.getGuardrailsConfig(),
          ])
        : await Promise.all([
            runtimeApi.listDomains(),
            runtimeApi.getGuardrailsConfig(),
          ]);

      setDomains(nextDomains);
      setGuardrailsConfig(nextGuardrailsConfig);

      return {
        domains: nextDomains,
        guardrailsConfig: nextGuardrailsConfig,
      };
    } catch (caughtError) {
      const apiError = toApiError(caughtError);
      setError(apiError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refreshRuntimeMetadata();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [refreshRuntimeMetadata]);

  return {
    domains,
    domainOptions: domains?.domains ?? [],
    guardrailsConfig,
    isLoading,
    error,
    refreshRuntimeMetadata,
  };
};
