export interface GuideStoreState {
  dismissedMessageIds: string[];
  isCollapsed: boolean;
  isFirstVisit: boolean;
  isHydrated: boolean;
}

type Listener = () => void;
type GuideStoreUpdater =
  | Partial<GuideStoreState>
  | ((state: GuideStoreState) => GuideStoreState);

const GUIDE_STORAGE_KEY = "agentic-studio-guide-state";

const listeners = new Set<Listener>();

let state: GuideStoreState = {
  dismissedMessageIds: [],
  isCollapsed: false,
  isFirstVisit: true,
  isHydrated: false,
};

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const readStoredState = (): Partial<GuideStoreState> | undefined => {
  if (!canUseStorage()) {
    return undefined;
  }

  const rawValue = window.localStorage.getItem(GUIDE_STORAGE_KEY);

  if (!rawValue) {
    return undefined;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<GuideStoreState>;

    return {
      dismissedMessageIds: Array.isArray(parsedValue.dismissedMessageIds)
        ? parsedValue.dismissedMessageIds.filter(
            (messageId): messageId is string => typeof messageId === "string",
          )
        : [],
      isCollapsed: Boolean(parsedValue.isCollapsed),
      isFirstVisit:
        typeof parsedValue.isFirstVisit === "boolean"
          ? parsedValue.isFirstVisit
          : true,
    };
  } catch {
    return undefined;
  }
};

const writeStoredState = (nextState: GuideStoreState) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    GUIDE_STORAGE_KEY,
    JSON.stringify({
      dismissedMessageIds: nextState.dismissedMessageIds,
      isCollapsed: nextState.isCollapsed,
      isFirstVisit: nextState.isFirstVisit,
    }),
  );
};

export const getGuideStoreSnapshot = () => state;

export const subscribeGuideStore = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setGuideStoreState = (updater: GuideStoreUpdater) => {
  state =
    typeof updater === "function"
      ? updater(state)
      : {
          ...state,
          ...updater,
        };

  writeStoredState(state);
  emitChange();
};

export const guideStoreActions = {
  hydrate: () => {
    if (state.isHydrated) {
      return;
    }

    const storedState = readStoredState();
    state = {
      ...state,
      ...storedState,
      isHydrated: true,
    };

    emitChange();
  },

  dismissMessage: (messageId: string) => {
    setGuideStoreState((currentState) => ({
      ...currentState,
      dismissedMessageIds: currentState.dismissedMessageIds.includes(messageId)
        ? currentState.dismissedMessageIds
        : [...currentState.dismissedMessageIds, messageId],
      isCollapsed: true,
      isFirstVisit: false,
    }));
  },

  setCollapsed: (isCollapsed: boolean) => {
    setGuideStoreState({ isCollapsed });
  },

  markFirstVisitSeen: () => {
    setGuideStoreState({ isFirstVisit: false });
  },

  reset: () => {
    setGuideStoreState({
      dismissedMessageIds: [],
      isCollapsed: false,
      isFirstVisit: true,
    });
  },
};
