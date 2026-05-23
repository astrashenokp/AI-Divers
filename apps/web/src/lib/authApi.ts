import { AUTH_LOGIN_PATH, AUTH_LOGOUT_PATH, AUTH_REGISTER_PATH } from "./constants";
import { apiClient } from "./apiClient";
import type { AuthRequest, AuthResponse } from "./types";

export const login = (request: AuthRequest) =>
  apiClient.post<AuthRequest, AuthResponse>(AUTH_LOGIN_PATH, request);

export const register = (request: AuthRequest) =>
  apiClient.post<AuthRequest, AuthResponse>(AUTH_REGISTER_PATH, request);

export const logout = () =>
  apiClient.post<Record<string, never>, void>(AUTH_LOGOUT_PATH, {});
