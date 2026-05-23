"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import * as authApi from "../lib/authApi";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  subscribeAuthSession,
} from "../lib/authSession";
import type { ApiErrorShape, AuthRequest } from "../lib/types";

const toApiError = (error: unknown): ApiErrorShape => ({
  message: error instanceof Error ? error.message : "Unexpected auth error.",
});

export const useAuth = () => {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSession,
    () => null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorShape>();

  const login = useCallback(async (credentials: AuthRequest) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await authApi.login(credentials);
      setAuthSession({
        token: response.token,
        tokenType: response.tokenType || "Bearer",
        username: credentials.username,
      });
      return response;
    } catch (authError) {
      const apiError = toApiError(authError);
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: AuthRequest) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await authApi.register(credentials);
      setAuthSession({
        token: response.token,
        tokenType: response.tokenType || "Bearer",
        username: credentials.username,
      });
      return response;
    } catch (authError) {
      const apiError = toApiError(authError);
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      await authApi.logout();
    } catch {
      // The backend logout endpoint is stateless. Local cleanup is enough.
    } finally {
      clearAuthSession();
      setIsLoading(false);
    }
  }, []);

  return {
    session,
    isAuthenticated: Boolean(session?.token),
    isLoading,
    error,
    login,
    register,
    logout,
  };
};
