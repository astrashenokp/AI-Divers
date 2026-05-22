import {
  getPublicWidgetConfigPath,
  LIVE_TRACKING_EVENTS,
} from "./constants";
import {
  mockAgents,
  mockDeploymentSettings,
  mockGuardrails,
  mockLiveTrackingEvents,
  mockSessionMessages,
  mockToolTypes,
} from "./mockData";
import type {
  Agent,
  AgentDraft,
  AgentTool,
  ChatMessage,
  ChatSession,
  DeploymentSettings,
  GuardrailConfig,
  LiveTrackingEvent,
  StreamEventHandlers,
  ToolType,
  WidgetConfig,
} from "./types";

const MOCK_DELAY_MS = 150;
const STREAM_DELAY_MS = 250;

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

let agents = clone(mockAgents);
let messages = clone(mockSessionMessages);

export async function listAgents(): Promise<Agent[]> {
  await wait(MOCK_DELAY_MS);
  return clone(agents);
}

export async function createAgent(draft: AgentDraft): Promise<Agent> {
  await wait(MOCK_DELAY_MS);

  const timestamp = new Date().toISOString();
  const agent: Agent = {
    id: createId("agent"),
    name: draft.name,
    description: draft.description,
    systemPrompt: draft.systemPrompt,
    modelProvider: draft.modelProvider,
    modelName: draft.modelName,
    status: draft.status ?? "draft",
    tools: draft.tools ?? [],
    guardrails: draft.guardrails ?? mockGuardrails,
    deployment:
      draft.deployment ??
      ({
        agentId: "",
        deploymentSlug: draft.name.toLowerCase().replace(/\s+/g, "-"),
        restEnabled: false,
        webhookEnabled: false,
        widgetEnabled: false,
        publicAccessEnabled: false,
        updatedAt: timestamp,
      } satisfies DeploymentSettings),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  agent.deployment = {
    ...agent.deployment,
    agentId: agent.id,
  };

  agents = [agent, ...agents];

  return clone(agent);
}

export async function updateAgent(
  agentId: string,
  draft: AgentDraft,
): Promise<Agent> {
  await wait(MOCK_DELAY_MS);

  const existingAgent = agents.find((agent) => agent.id === agentId);

  if (!existingAgent) {
    throw new Error(`Agent ${agentId} was not found.`);
  }

  const updatedAgent: Agent = {
    ...existingAgent,
    ...draft,
    tools: draft.tools ?? existingAgent.tools,
    guardrails: draft.guardrails ?? existingAgent.guardrails,
    deployment: draft.deployment ?? existingAgent.deployment,
    updatedAt: new Date().toISOString(),
  };

  agents = agents.map((agent) => (agent.id === agentId ? updatedAgent : agent));

  return clone(updatedAgent);
}

export async function listToolTypes(): Promise<ToolType[]> {
  await wait(MOCK_DELAY_MS);
  return clone(mockToolTypes);
}

export async function attachToolToAgent(
  agentId: string,
  tool: Omit<AgentTool, "id" | "agentId" | "createdAt" | "updatedAt">,
): Promise<AgentTool> {
  await wait(MOCK_DELAY_MS);

  const timestamp = new Date().toISOString();
  const attachedTool: AgentTool = {
    ...tool,
    id: createId("tool"),
    agentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  agents = agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          tools: [...agent.tools, attachedTool],
          updatedAt: timestamp,
        }
      : agent,
  );

  return clone(attachedTool);
}

export async function updateGuardrails(
  agentId: string,
  guardrails: GuardrailConfig,
): Promise<GuardrailConfig> {
  await wait(MOCK_DELAY_MS);

  agents = agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          guardrails,
          updatedAt: new Date().toISOString(),
        }
      : agent,
  );

  return clone(guardrails);
}

export async function createAgentSession(agentId: string): Promise<ChatSession> {
  await wait(MOCK_DELAY_MS);

  const timestamp = new Date().toISOString();

  return {
    id: createId("session"),
    agentId,
    source: "STUDIO",
    title: "Studio test chat",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listSessionMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  await wait(MOCK_DELAY_MS);
  return clone(messages.filter((message) => message.sessionId === sessionId));
}

export async function updateDeploymentSettings(
  agentId: string,
  deployment: DeploymentSettings,
): Promise<DeploymentSettings> {
  await wait(MOCK_DELAY_MS);

  const updatedDeployment: DeploymentSettings = {
    ...deployment,
    agentId,
    updatedAt: new Date().toISOString(),
  };

  agents = agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          deployment: updatedDeployment,
          updatedAt: updatedDeployment.updatedAt ?? agent.updatedAt,
        }
      : agent,
  );

  return clone(updatedDeployment);
}

export async function getWidgetConfig(
  deploymentSlug: string,
): Promise<WidgetConfig> {
  await wait(MOCK_DELAY_MS);

  const agent =
    agents.find(
      (candidate) => candidate.deployment.deploymentSlug === deploymentSlug,
    ) ?? agents[0];

  return {
    deploymentSlug,
    agentName: agent.name,
    welcomeMessage: `Ask ${agent.name} to help with your workflow.`,
    primaryColor: "#2563eb",
    allowedOrigins: ["http://localhost:3000"],
  };
}

const createStreamEvent = (
  event: LiveTrackingEvent,
  overrides: Partial<LiveTrackingEvent> = {},
): LiveTrackingEvent => ({
  ...event,
  ...overrides,
  id: overrides.id ?? createId("event"),
  timestamp: new Date().toISOString(),
});

export async function runMockAgentExecutionStream(
  agentId: string,
  message: string,
  handlers: StreamEventHandlers<LiveTrackingEvent>,
  signal?: AbortSignal,
): Promise<void> {
  const executionId = createId("execution");

  const streamEvents: LiveTrackingEvent[] = [
    createStreamEvent(mockLiveTrackingEvents[0], {
      executionId,
      summary: `Started execution for agent ${agentId}.`,
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      summary: "Reading the user request and selecting a plan.",
      input: { message },
    }),
    createStreamEvent(mockLiveTrackingEvents[2], {
      executionId,
      summary: "Checking whether web context would improve the answer.",
    }),
    createStreamEvent(mockLiveTrackingEvents[3], {
      executionId,
      summary: "Tool returned concise context for the response.",
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      stepNumber: 5,
      summary: "Composing a final answer from the gathered context.",
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 6,
      summary: "Agentic Studio is a configurable workspace",
      status: "running",
      output: { delta: "Agentic Studio is a configurable workspace " },
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 7,
      summary: "for building, observing, and deploying agents",
      status: "running",
      output: { delta: "for building, observing, and deploying agents " },
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 8,
      summary: "instead of a single hardcoded chatbot.",
      status: "running",
      output: { delta: "instead of a single hardcoded chatbot." },
    }),
    createStreamEvent(mockLiveTrackingEvents[0], {
      executionId,
      type: LIVE_TRACKING_EVENTS.EXECUTION_COMPLETED,
      stepNumber: 9,
      summary: "Execution completed with a final answer.",
      status: "completed",
      output: {
        finalMessage:
          "Agentic Studio is a configurable workspace for building, observing, and deploying agents instead of a single hardcoded chatbot.",
      },
    }),
  ];

  try {
    for (const event of streamEvents) {
      if (signal?.aborted) {
        break;
      }

      await wait(STREAM_DELAY_MS);
      handlers.onEvent?.(event.type, clone(event));
    }

    const timestamp = new Date().toISOString();
    messages = [
      ...messages,
      {
        id: createId("message-user"),
        sessionId: "session-demo-1",
        role: "user",
        content: message,
        createdAt: timestamp,
      },
      {
        id: createId("message-assistant"),
        sessionId: "session-demo-1",
        role: "assistant",
        content:
          "Agentic Studio is a configurable workspace for building, observing, and deploying agents instead of a single hardcoded chatbot.",
        createdAt: timestamp,
        metadata: {
          widgetConfigPath: getPublicWidgetConfigPath(
            mockDeploymentSettings.deploymentSlug,
          ),
        },
      },
    ];
  } catch (error) {
    handlers.onError?.({
      message:
        error instanceof Error ? error.message : "Mock stream failed to run.",
    });
  } finally {
    handlers.onDone?.();
  }
}
