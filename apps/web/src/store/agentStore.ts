import type {
  Agent,
  AgentDraft,
  ApiErrorShape,
  GuardrailConfig,
  ToolType,
} from "../lib/types";

export interface AgentStoreState {
  agents: Agent[];
  selectedAgentId?: string;
  agentDraft?: AgentDraft;
  toolTypes: ToolType[];
  guardrails?: GuardrailConfig;
  isLoading: boolean;
  error?: ApiErrorShape;
}

type Listener = () => void;
type AgentStoreUpdater =
  | Partial<AgentStoreState>
  | ((state: AgentStoreState) => AgentStoreState);

const listeners = new Set<Listener>();

let state: AgentStoreState = {
  agents: [],
  toolTypes: [],
  isLoading: false,
};

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const getAgentStoreSnapshot = () => state;

export const subscribeAgentStore = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setAgentStoreState = (updater: AgentStoreUpdater) => {
  state =
    typeof updater === "function"
      ? updater(state)
      : {
          ...state,
          ...updater,
        };

  emitChange();
};

export const getSelectedAgent = () =>
  state.agents.find((agent) => agent.id === state.selectedAgentId);

export const agentStoreActions = {
  setLoading: (isLoading: boolean) => {
    setAgentStoreState({ isLoading });
  },

  setError: (error?: ApiErrorShape) => {
    setAgentStoreState({ error });
  },

  setAgents: (agents: Agent[]) => {
    setAgentStoreState((currentState) => ({
      ...currentState,
      agents,
      selectedAgentId:
        currentState.selectedAgentId ?? agents[0]?.id,
    }));
  },

  upsertAgent: (agent: Agent) => {
    setAgentStoreState((currentState) => {
      const hasAgent = currentState.agents.some(
        (candidate) => candidate.id === agent.id,
      );

      return {
        ...currentState,
        agents: hasAgent
          ? currentState.agents.map((candidate) =>
              candidate.id === agent.id ? agent : candidate,
            )
          : [agent, ...currentState.agents],
        selectedAgentId: currentState.selectedAgentId ?? agent.id,
      };
    });
  },

  selectAgent: (agentId?: string) => {
    setAgentStoreState({ selectedAgentId: agentId });
  },

  setAgentDraft: (agentDraft?: AgentDraft) => {
    setAgentStoreState({ agentDraft });
  },

  setToolTypes: (toolTypes: ToolType[]) => {
    setAgentStoreState({ toolTypes });
  },

  setGuardrails: (guardrails?: GuardrailConfig) => {
    setAgentStoreState({ guardrails });
  },
};
