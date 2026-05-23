import {
  getPublicWidgetConfigPath,
  LIVE_TRACKING_EVENTS,
} from "./constants";
import {
  mockAgents,
  mockDeploymentSettings,
  mockDomains,
  mockGuardrails,
  mockGuardrailsConfig,
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
  DomainsResponse,
  GuardrailConfig,
  GuardrailsConfigResponse,
  LiveTrackingEvent,
  StreamEventHandlers,
  ToolTypesResponse,
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

export async function getAgent(agentId: string): Promise<Agent> {
  await wait(MOCK_DELAY_MS);

  const agent = agents.find((candidate) => candidate.id === agentId);

  if (!agent) {
    throw new Error("Agent not found.");
  }

  return clone(agent);
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

export async function listToolTypes(): Promise<ToolTypesResponse> {
  await wait(MOCK_DELAY_MS);
  return clone(mockToolTypes);
}

export async function listDomains(): Promise<DomainsResponse> {
  await wait(MOCK_DELAY_MS);
  return clone(mockDomains);
}

export async function getGuardrailsConfig(): Promise<GuardrailsConfigResponse> {
  await wait(MOCK_DELAY_MS);
  return clone(mockGuardrailsConfig);
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

export async function generateDeploymentSettings(
  agentId: string,
): Promise<DeploymentSettings> {
  await wait(MOCK_DELAY_MS);

  const existingAgent = agents.find((agent) => agent.id === agentId);
  const timestamp = new Date().toISOString();
  const generatedDeployment: DeploymentSettings = {
    agentId,
    deploymentSlug:
      existingAgent?.deployment.deploymentSlug || `ag-${createId("demo")}`,
    restEnabled: true,
    webhookEnabled: false,
    widgetEnabled: existingAgent?.deployment.widgetEnabled ?? false,
    publicAccessEnabled: true,
    updatedAt: timestamp,
  };

  agents = agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          deployment: generatedDeployment,
          updatedAt: timestamp,
        }
      : agent,
  );

  return clone(generatedDeployment);
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
    welcomeMessage: `Запитайте ${agent.name}, як він може допомогти з вашим сценарієм.`,
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
      summary: `Запущено виконання для агента ${agentId}.`,
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      summary: "Агент читає запит користувача і обирає план.",
      input: { message },
    }),
    createStreamEvent(mockLiveTrackingEvents[2], {
      executionId,
      summary: "Агент перевіряє, чи потрібен додатковий контекст.",
    }),
    createStreamEvent(mockLiveTrackingEvents[3], {
      executionId,
      summary: "Tool повернув короткий контекст для відповіді.",
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      stepNumber: 5,
      summary: "Агент складає фінальну відповідь із зібраного контексту.",
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 6,
      summary: "Agentic Studio - це налаштовуваний простір",
      status: "running",
      output: { delta: "Agentic Studio - це налаштовуваний простір " },
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 7,
      summary: "для створення, спостереження і deployment агентів",
      status: "running",
      output: { delta: "для створення, спостереження і deployment агентів " },
    }),
    createStreamEvent(mockLiveTrackingEvents[1], {
      executionId,
      type: LIVE_TRACKING_EVENTS.MESSAGE_DELTA,
      stepNumber: 8,
      summary: "а не один жорстко зашитий chatbot.",
      status: "running",
      output: { delta: "а не один жорстко зашитий chatbot." },
    }),
    createStreamEvent(mockLiveTrackingEvents[0], {
      executionId,
      type: LIVE_TRACKING_EVENTS.EXECUTION_COMPLETED,
      stepNumber: 9,
      summary: "Виконання завершено з фінальною відповіддю.",
      status: "completed",
      output: {
        finalMessage:
          "Agentic Studio - це налаштовуваний простір для створення, спостереження і deployment агентів, а не один жорстко зашитий chatbot.",
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
          "Agentic Studio - це налаштовуваний простір для створення, спостереження і deployment агентів, а не один жорстко зашитий chatbot.",
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
        error instanceof Error
          ? error.message
          : "Не вдалося запустити демо-потік.",
    });
  } finally {
    handlers.onDone?.();
  }
}
