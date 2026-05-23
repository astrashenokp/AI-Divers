"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getGuideMessage,
  shouldShowGuideMessage,
} from "../lib/guideRules";
import type {
  GuideAction,
  GuideActionType,
  GuideContext,
} from "../lib/guideTypes";
import { executionStoreActions } from "../store/executionStore";
import {
  getGuideStoreSnapshot,
  guideStoreActions,
  subscribeGuideStore,
} from "../store/guideStore";

export type UseAiDiverGuideOptions = Partial<
  Omit<GuideContext, "isFirstVisit" | "route">
> & {
  route?: string;
};

export type GuideActionHandlers = Partial<
  Record<GuideActionType, (action: GuideAction) => void | Promise<void>>
>;

export interface UseAiDiverGuideConfig {
  context?: UseAiDiverGuideOptions;
  actionHandlers?: GuideActionHandlers;
}

const DEFAULT_GUIDE_CONTEXT: Omit<GuideContext, "isFirstVisit" | "route"> = {
  hasSelectedAgent: false,
  hasSystemPrompt: false,
  enabledToolCount: 0,
  backendReachable: null,
  isStreaming: false,
  deploymentConfigured: false,
};

const EMPTY_GUIDE_OPTIONS: UseAiDiverGuideOptions = {};

export const useAiDiverGuide = (config: UseAiDiverGuideConfig = {}) => {
  const pathname = usePathname();
  const options = config.context ?? EMPTY_GUIDE_OPTIONS;
  const state = useSyncExternalStore(
    subscribeGuideStore,
    getGuideStoreSnapshot,
    getGuideStoreSnapshot,
  );

  useEffect(() => {
    guideStoreActions.hydrate();
  }, []);

  const context = useMemo<GuideContext>(
    () => ({
      ...DEFAULT_GUIDE_CONTEXT,
      ...options,
      route: options.route ?? pathname ?? "/",
      isFirstVisit: state.isFirstVisit,
    }),
    [options, pathname, state.isFirstVisit],
  );

  const message = useMemo(() => getGuideMessage(context), [context]);
  const shouldShowMessage = shouldShowGuideMessage(
    message,
    state.dismissedMessageIds,
  );
  const isVisible = shouldShowMessage && !state.isCollapsed;

  const dismiss = useCallback(() => {
    if (message) {
      guideStoreActions.dismissMessage(message.id);
      return;
    }

    guideStoreActions.setCollapsed(true);
  }, [message]);

  const collapse = useCallback(() => {
    guideStoreActions.setCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    guideStoreActions.setCollapsed(false);
  }, []);

  const handleAction = useCallback(
    async (action: GuideAction) => {
      if (action.type === "dismiss") {
        dismiss();
        return;
      }

      if (
        action.type === "retry_stream" ||
        action.type === "run_mock_mode" ||
        action.type === "check_backend_health"
      ) {
        executionStoreActions.setError(undefined);
      }

      await config.actionHandlers?.[action.type]?.(action);
      guideStoreActions.markFirstVisitSeen();

      if (action.type !== "check_backend_health") {
        guideStoreActions.setCollapsed(true);
      }
    },
    [config.actionHandlers, dismiss],
  );

  return {
    context,
    message,
    actions: message?.actions ?? [],
    isCollapsed: state.isCollapsed,
    isVisible,
    isHydrated: state.isHydrated,
    handleAction,
    dismiss,
    collapse,
    expand,
    markFirstVisitSeen: guideStoreActions.markFirstVisitSeen,
    resetGuide: guideStoreActions.reset,
  };
};
