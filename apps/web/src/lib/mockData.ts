import { LIVE_TRACKING_EVENTS } from "./constants";
import type {
  Agent,
  AgentTool,
  ChatMessage,
  DeploymentSettings,
  DomainsResponse,
  GuardrailConfig,
  GuardrailsConfigResponse,
  LiveTrackingEvent,
  ToolType,
  ToolTypesResponse,
} from "./types";

const now = "2026-05-22T10:00:00.000Z";

export const mockGuardrails: GuardrailConfig = {
  maxSteps: 6,
  forbiddenTopics: ["medical diagnosis", "illegal activity"],
  requireHumanConfirmationForTools: [
    "http_request",
    "save_progress",
    "save_note",
  ],
};

export const mockDomains: DomainsResponse = {
  domains: [
    { id: "ecommerce", label: "E-commerce" },
    { id: "education", label: "Education" },
    { id: "tourism", label: "Tourism" },
    { id: "general", label: "General" },
  ],
};

export const mockGuardrailsConfig: GuardrailsConfigResponse = {
  valid_domains: ["ecommerce", "education", "tourism", "general"],
  default_max_steps: 10,
  default_timeout_seconds: 30,
  domain_max_steps: {
    ecommerce: 8,
    education: 10,
    tourism: 10,
    general: 6,
  },
  tools_requiring_confirmation: ["http_request", "save_progress", "save_note"],
  domain_tool_allowlists: {
    ecommerce: [
      "get_current_time",
      "search_web",
      "save_note",
      "http_request",
      "product_search",
      "order_status",
      "check_price",
    ],
    education: [
      "get_current_time",
      "search_web",
      "save_note",
      "http_request",
      "course_search",
      "course_info",
      "save_progress",
    ],
    tourism: [
      "get_current_time",
      "search_web",
      "save_note",
      "http_request",
      "hotel_search",
      "itinerary_plan",
      "get_weather",
    ],
    general: [
      "get_current_time",
      "search_web",
      "save_note",
      "http_request",
    ],
  },
};

export const mockDeploymentSettings: DeploymentSettings = {
  agentId: "agent-general-assistant",
  deploymentSlug: "general-assistant",
  restEnabled: true,
  webhookEnabled: false,
  widgetEnabled: true,
  publicAccessEnabled: true,
  widgetIframeCode:
    '<iframe src="http://localhost:8080/api/v1/public/widgets/general-assistant/config"></iframe>',
  updatedAt: now,
};

export const mockToolTypes: ToolTypesResponse = {
  categories: [
    {
      id: "education",
      label: "Освіта",
      description:
        "Tools for learning assistants, course search, course details, and student progress.",
      tools: [
        {
          type: "course_search",
          name: "Course Search",
          description: "Searches learning courses by topic, skill, or level.",
          category: "education",
          requiresHumanConfirmation: false,
          configSchema: {
            query: "string",
            level: "beginner | intermediate | advanced | any",
            max_results: "number",
          },
        },
        {
          type: "course_info",
          name: "Course Info",
          description: "Returns details for a specific course.",
          category: "education",
          requiresHumanConfirmation: false,
          configSchema: {
            course_id: "string",
          },
        },
        {
          type: "save_progress",
          name: "Save Progress",
          description: "Saves student lesson progress.",
          category: "education",
          requiresHumanConfirmation: true,
          configSchema: {
            user_id: "string",
            course_id: "string",
            lesson_id: "string",
          },
        },
      ],
    },
    {
      id: "tourism",
      label: "Туризм",
      description:
        "Tools for hotel search, travel itinerary planning, and weather forecasts.",
      tools: [
        {
          type: "hotel_search",
          name: "Hotel Search",
          description: "Searches hotels by city, dates, and guest count.",
          category: "tourism",
          requiresHumanConfirmation: false,
          configSchema: {
            city: "string",
            check_in: "YYYY-MM-DD",
            check_out: "YYYY-MM-DD",
            guests: "number",
          },
        },
        {
          type: "itinerary_plan",
          name: "Itinerary Plan",
          description: "Builds a travel plan for a destination.",
          category: "tourism",
          requiresHumanConfirmation: false,
          configSchema: {
            destination: "string",
            days: "number",
            interests: "string",
          },
        },
        {
          type: "get_weather",
          name: "Get Weather",
          description: "Returns a weather forecast for a city.",
          category: "tourism",
          requiresHumanConfirmation: false,
          configSchema: {
            city: "string",
            days: "number",
          },
        },
      ],
    },
    {
      id: "ecommerce",
      label: "E-commerce (Продажі)",
      description:
        "Tools for product lookup, order status, prices, sales flows, and customer requests.",
      tools: [
        {
          type: "product_search",
          name: "Product Search",
          description: "Searches products by name, keyword, or category.",
          category: "ecommerce",
          requiresHumanConfirmation: false,
          configSchema: {
            query: "string",
            category: "string",
            max_results: "number",
          },
        },
        {
          type: "order_status",
          name: "Order Status",
          description: "Checks order status and tracking information.",
          category: "ecommerce",
          requiresHumanConfirmation: false,
          configSchema: {
            order_id: "string",
          },
        },
        {
          type: "check_price",
          name: "Check Price",
          description: "Checks price and availability for a product.",
          category: "ecommerce",
          requiresHumanConfirmation: false,
          configSchema: {
            product_id: "string",
          },
        },
      ],
    },
    {
      id: "general",
      label: "Інше",
      description:
        "Shared tools available across domains and useful for general assistant tasks.",
      tools: [
        {
          type: "get_current_time",
          name: "Get Current Time",
          description: "Returns the current date and time for a timezone.",
          category: "general",
          requiresHumanConfirmation: false,
          configSchema: {
            timezone: "string",
          },
        },
        {
          type: "search_web",
          name: "Search Web",
          description: "Searches the web for current information.",
          category: "general",
          requiresHumanConfirmation: false,
          configSchema: {
            query: "string",
            max_results: "number",
          },
        },
        {
          type: "save_note",
          name: "Save Note",
          description: "Saves an important note for the current session.",
          category: "general",
          requiresHumanConfirmation: true,
          configSchema: {
            session_id: "string",
            content: "string",
          },
        },
        {
          type: "http_request",
          name: "HTTP Request",
          description: "Calls a public external API with runtime guardrails.",
          category: "general",
          requiresHumanConfirmation: true,
          configSchema: {
            url: "string",
            method: "GET | POST | PUT | PATCH | DELETE",
            headers: "object",
            body: "string",
            timeout_seconds: "number",
          },
          requiresSecret: true,
        },
      ],
    },
  ],
};

export const mockLegacyToolTypes: ToolType[] =
  mockToolTypes.categories.flatMap((category) =>
    category.tools.map((tool) => ({
      type: tool.type,
      category: category.id,
      displayName: tool.name,
      description: tool.description,
      configSchema: tool.configSchema,
      requiresSecret: tool.requiresSecret,
    })),
  );

export const mockAgentTools: AgentTool[] = [
  {
    id: "tool-current-time-1",
    agentId: "agent-general-assistant",
    type: "get_current_time",
    category: "general",
    name: "Get Current Time",
    enabled: true,
    config: {
      timezone: "Europe/Kyiv",
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tool-search-web-1",
    agentId: "agent-general-assistant",
    type: "search_web",
    category: "general",
    name: "Search Web",
    enabled: true,
    config: {
      max_results: 3,
    },
    createdAt: now,
    updatedAt: now,
  },
];

export const mockAgents: Agent[] = [
  {
    id: "agent-general-assistant",
    name: "Загальний асистент",
    description:
      "Допомагає відповідати на практичні запити за допомогою спільних tools: часу, web search, нотаток і безпечних HTTP-запитів.",
    systemPrompt:
      "Ти корисний загальний асистент. Використовуй доступні tools тільки тоді, коли вони покращують відповідь, і пояснюй результати tools чітко.",
    modelProvider: "demo",
    modelName: "demo-general-assistant",
    status: "active",
    tools: mockAgentTools,
    guardrails: mockGuardrails,
    deployment: mockDeploymentSettings,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "agent-education-assistant",
    name: "Освітній асистент",
    description:
      "Допомагає студентам знаходити курси, розуміти деталі навчання і відстежувати прогрес.",
    systemPrompt:
      "Ти освітній асистент. Допомагай користувачам знаходити відповідні курси і чітко пояснюй навчальні опції.",
    modelProvider: "demo",
    modelName: "demo-education-assistant",
    status: "draft",
    tools: [],
    guardrails: {
      maxSteps: 10,
      forbiddenTopics: ["private credentials"],
      requireHumanConfirmationForTools: ["save_progress", "http_request"],
    },
    deployment: {
      agentId: "agent-education-assistant",
      deploymentSlug: "education-assistant",
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
    content: "Який зараз час у Києві?",
    createdAt: now,
  },
  {
    id: "message-assistant-1",
    sessionId: "session-demo-1",
    role: "assistant",
    content:
      "Я можу перевірити поточний час через get_current_time і повернути відповідь у цьому чаті.",
    createdAt: now,
  },
];

export const mockLiveTrackingEvents: LiveTrackingEvent[] = [
  {
    id: "event-1",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.EXECUTION_STARTED,
    stepNumber: 1,
    summary: "Запущено виконання для Загального асистента.",
    status: "running",
    timestamp: now,
  },
  {
    id: "event-2",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.REASONING_STEP,
    stepNumber: 2,
    summary: "Агент вирішує, чи потрібен спільний tool.",
    status: "running",
    timestamp: now,
  },
  {
    id: "event-3",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.TOOL_CALL_STARTED,
    stepNumber: 3,
    summary: "Виклик get_current_time для потрібного часового поясу.",
    toolName: "get_current_time",
    status: "running",
    timestamp: now,
    input: {
      timezone: "Europe/Kyiv",
    },
  },
  {
    id: "event-4",
    executionId: "execution-demo-1",
    type: LIVE_TRACKING_EVENTS.TOOL_CALL_FINISHED,
    stepNumber: 4,
    summary: "get_current_time успішно завершився.",
    toolName: "get_current_time",
    status: "completed",
    timestamp: now,
    output: {
      timezone: "Europe/Kyiv",
    },
  },
];
