import { LIVE_TRACKING_EVENTS } from "./constants";
import type {
  Agent,
  AgentTool,
  ChatMessage,
  DeploymentSettings,
  GuardrailConfig,
  LiveTrackingEvent,
  ToolType,
} from "./types";

const now = "2026-05-22T10:00:00.000Z";

export const mockGuardrails: GuardrailConfig = {
  maxSteps: 6,
  forbiddenTopics: ["medical diagnosis", "illegal activity"],
  requireHumanConfirmationForTools: ["database_query"],
};

export const mockDeploymentSettings: DeploymentSettings = {
  agentId: "agent-hackathon-mentor",
  deploymentSlug: "hackathon-mentor",
  restEnabled: true,
  webhookEnabled: false,
  widgetEnabled: true,
  publicAccessEnabled: true,
  widgetIframeCode:
    '<iframe src="http://localhost:8080/api/v1/public/widgets/hackathon-mentor/config"></iframe>',
  updatedAt: now,
};

export const mockToolTypes: ToolType[] = [
  {
    type: "web_search",
    displayName: "Web Search",
    description: "Searches public web results for current information.",
    configSchema: {
      required: ["provider"],
      properties: {
        provider: { type: "string" },
      },
    },
    requiresSecret: false,
  },
  {
    type: "http_request",
    displayName: "HTTP Request",
    description: "Calls approved HTTP endpoints with configured methods.",
    configSchema: {
      required: ["baseUrl"],
      properties: {
        baseUrl: { type: "string" },
        allowedMethods: { type: "array" },
      },
    },
    requiresSecret: true,
  },
  {
    type: "database_query",
    displayName: "Database Query",
    description: "Runs safe read-only queries against configured data sources.",
    configSchema: {
      required: ["connectionName"],
      properties: {
        connectionName: { type: "string" },
        readOnly: { type: "boolean" },
      },
    },
    requiresSecret: true,
  },
];

export const mockAgentTools: AgentTool[] = [
  {
    id: "tool-web-search-1",
    agentId: "agent-hackathon-mentor",
    type: "web_search",
    name: "Public Web Search",
    enabled: true,
    config: {
      provider: "mock",
      resultLimit: 3,
    },
    createdAt: now,
    updatedAt: now,
  },
];

export const mockAgents: Agent[] = [
  {
    id: "agent-hackathon-mentor",
    name: "Hackathon Mentor",
    description:
      "Helps teams sharpen project scope, demo flow, and technical tradeoffs.",
    systemPrompt:
      "You are a practical hackathon mentor. Give concise, actionable guidance and ask for missing context when needed.",
    modelProvider: "mock",
    modelName: "mock-hackathon-mentor",
    status: "active",
    tools: mockAgentTools,
    guardrails: mockGuardrails,
    deployment: mockDeploymentSettings,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "agent-research-assistant",
    name: "Research Assistant",
    description:
      "Helps collect and summarize research notes with transparent sources.",
    systemPrompt:
      "You are a careful research assistant. Separate known facts from assumptions and cite tool outputs when available.",
    modelProvider: "mock",
    modelName: "mock-research-assistant",
    status: "draft",
    tools: [],
    guardrails: {
      maxSteps: 5,
      forbiddenTopics: ["private credentials"],
      requireHumanConfirmationForTools: ["http_request", "database_query"],
    },
    deployment: {
      agentId: "agent-research-assistant",
      deploymentSlug: "research-assistant",
      restEnabled: false,
      webhookEnabled: false,
      widgetEnabled: false,
      publicAccessEnabled: false,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  },
];

export const mockSessionMessages: ChatMessage[] = [
  {
    id: "message-user-1",
    sessionId: "session-demo-1",
    role: "user",
    content: "Help me explain why Agentic Studio is more than a chatbot.",
    createdAt: now,
  },
  {
    id: "message-assistant-1",
    sessionId: "session-demo-1",
    role: "assistant",
    content:
      "Frame it as a configurable agent workspace: builder, tools, guardrails, live tracking, and deployment surfaces.",
    createdAt: now,
  },
];

export const mockLiveTrackingEvents: LiveTrackingEvent[] = [
  {
    id: "event-1",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.EXECUTION_STARTED,
    stepNumber: 1,
    summary: "Started execution for Hackathon Mentor.",
    status: "running",
    timestamp: now,
  },
  {
    id: "event-2",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.REASONING_STEP,
    stepNumber: 2,
    summary: "Deciding whether external context is needed.",
    status: "running",
    timestamp: now,
  },
  {
    id: "event-3",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.TOOL_CALL_STARTED,
    stepNumber: 3,
    summary: "Searching for concise positioning language.",
    toolName: "web_search",
    status: "running",
    timestamp: now,
    input: {
      query: "agent builder live tracking deployment agent platform",
    },
  },
  {
    id: "event-4",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.TOOL_CALL_FINISHED,
    stepNumber: 4,
    summary: "Search completed with summarized results.",
    toolName: "web_search",
    status: "completed",
    timestamp: now,
    output: {
      resultCount: 3,
    },
  },
];
