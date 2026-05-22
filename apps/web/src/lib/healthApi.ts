import { API_BASE_URL, HEALTH_PATH, USE_MOCK_API } from "./constants";
import { apiClient } from "./apiClient";
import type { BackendHealthResponse } from "./types";

export interface FrontendRuntimeStatus {
  apiBaseUrl: string;
  isMockApiEnabled: boolean;
}

export const getFrontendRuntimeStatus = (): FrontendRuntimeStatus => ({
  apiBaseUrl: API_BASE_URL,
  isMockApiEnabled: USE_MOCK_API,
});

export const getBackendHealth = () =>
  apiClient.get<BackendHealthResponse>(HEALTH_PATH);

export const checkBackendReachable = async (): Promise<boolean> => {
  try {
    await getBackendHealth();
    return true;
  } catch {
    return false;
  }
};
