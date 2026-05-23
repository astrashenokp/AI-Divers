"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBackendHealth,
  getFrontendRuntimeStatus,
} from "../lib/healthApi";
import type { ApiErrorShape, BackendHealthResponse } from "../lib/types";

const toApiError = (error: unknown): ApiErrorShape => ({
  message:
    error instanceof Error ? error.message : "Unable to reach backend API.",
});

export const useBackendHealth = () => {
  const [health, setHealth] = useState<BackendHealthResponse>();
  const [isBackendReachable, setIsBackendReachable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorShape>();
  const runtimeStatus = getFrontendRuntimeStatus();

  const refreshHealth = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await getBackendHealth();
      setHealth(response);
      setIsBackendReachable(true);
      return response;
    } catch (caughtError) {
      const apiError = toApiError(caughtError);
      setHealth(undefined);
      setIsBackendReachable(false);
      setError(apiError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refreshHealth();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [refreshHealth]);

  return {
    health,
    isBackendReachable,
    runtimeStatus,
    isLoading,
    error,
    refreshHealth,
  };
};
