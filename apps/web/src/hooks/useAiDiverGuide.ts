"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getGuideMessage,
  shouldShowGuideMessage,
} from "../lib/guideRules";
import type { GuideContext } from "../lib/guideTypes";
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

const DEFAULT_GUIDE_CONTEXT: Omit<GuideContext, "isFirstVisit" | "route"> = {
  hasSelectedAgent: false,
  hasSystemPrompt: false,
  enabledToolCount: 0,
  backendReachable: null,
  isStreaming: false,
  deploymentConfigured: false,
};

export const useAiDiverGuide = (options: UseAiDiverGuideOptions = {}) => {
  const pathname = usePathname();
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

  return {
    context,
    message,
    actions: message?.actions ?? [],
    isCollapsed: state.isCollapsed,
    isVisible,
    isHydrated: state.isHydrated,
    dismiss,
    collapse,
    expand,
    markFirstVisitSeen: guideStoreActions.markFirstVisitSeen,
    resetGuide: guideStoreActions.reset,
  };
};
