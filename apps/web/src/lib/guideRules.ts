import type {
  GuideAction,
  GuideContext,
  GuideExecutionStatus,
  GuideMessage,
  GuideTrigger,
} from "./guideTypes";

export const CRITICAL_GUIDE_TRIGGERS: GuideTrigger[] = [
  "backend_unreachable",
  "stream_failed",
  "guardrail_blocked",
  "human_confirmation_required",
];

const action = (
  id: string,
  label: string,
  type: GuideAction["type"],
): GuideAction => ({
  id,
  label,
  type,
});

export const GUIDE_MESSAGES: Record<GuideTrigger, GuideMessage> = {
  first_visit: {
    id: "guide-first-visit",
    trigger: "first_visit",
    title: "First dive?",
    body: "I can help you create your first agent or fix a problem.",
    actions: [
      action("start-guided-setup", "Create first agent", "start_guided_setup"),
      action("explain-screen", "Explain this screen", "explain_screen"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  builder_empty: {
    id: "guide-builder-empty",
    trigger: "builder_empty",
    title: "Start with a role",
    body: "Choose a template or write a clear role for your agent.",
    actions: [
      action("insert-template", "Insert template", "insert_template"),
      action("explain-screen", "Explain builder", "explain_screen"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  agent_missing_prompt: {
    id: "guide-agent-missing-prompt",
    trigger: "agent_missing_prompt",
    title: "Add a system prompt",
    body: "A clear system prompt tells the agent how to behave before it uses tools.",
    actions: [
      action("insert-template", "Insert template", "insert_template"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  no_tools_selected: {
    id: "guide-no-tools-selected",
    trigger: "no_tools_selected",
    title: "Add at least one tool",
    body: "Your agent can answer, but it cannot act yet. Add a tool to show real agent behavior.",
    actions: [
      action("add-default-tool", "Add default tool", "add_default_tool"),
      action("explain-screen", "Explain tools", "explain_screen"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  backend_unreachable: {
    id: "guide-backend-unreachable",
    trigger: "backend_unreachable",
    title: "Backend is not reachable",
    body: "I cannot reach the backend. You can check the health endpoint or continue in mock mode.",
    actions: [
      action("check-backend-health", "Check backend health", "check_backend_health"),
      action("run-mock-mode", "Run mock mode", "run_mock_mode"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  stream_failed: {
    id: "guide-stream-failed",
    trigger: "stream_failed",
    title: "Live stream stopped",
    body: "The live stream stopped unexpectedly. You can retry or switch to mock mode.",
    actions: [
      action("retry-stream", "Retry", "retry_stream"),
      action("run-mock-mode", "Run mock mode", "run_mock_mode"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  guardrail_blocked: {
    id: "guide-guardrail-blocked",
    trigger: "guardrail_blocked",
    title: "Guardrail blocked this run",
    body: "A guardrail stopped this execution. Check the blocked topic or reduce the request risk.",
    actions: [
      action("explain-screen", "Explain guardrails", "explain_screen"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  human_confirmation_required: {
    id: "guide-human-confirmation-required",
    trigger: "human_confirmation_required",
    title: "Confirmation required",
    body: "This action needs human approval before the agent continues.",
    actions: [
      action("explain-screen", "Explain confirmation", "explain_screen"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  deployment_not_configured: {
    id: "guide-deployment-not-configured",
    trigger: "deployment_not_configured",
    title: "Deployment is not configured",
    body: "Your agent works in the studio. Enable a widget or API deployment to use it outside.",
    actions: [
      action("open-widget-preview", "Open widget preview", "open_widget_preview"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
  demo_mode: {
    id: "guide-demo-mode",
    trigger: "demo_mode",
    title: "Demo path is ready",
    body: "Use mock mode to create an agent, run a test task, show Live Tracking, and preview deployment safely.",
    actions: [
      action("start-guided-setup", "Start demo path", "start_guided_setup"),
      action("dismiss", "Hide", "dismiss"),
    ],
  },
};

const normalizeStatus = (status?: GuideExecutionStatus) =>
  status?.toLowerCase();

export const isCriticalGuideTrigger = (trigger: GuideTrigger) =>
  CRITICAL_GUIDE_TRIGGERS.includes(trigger);

export const getGuideTrigger = (
  context: GuideContext,
): GuideTrigger | undefined => {
  const latestStatus = normalizeStatus(context.latestExecutionStatus);

  if (context.backendReachable === false) {
    return "backend_unreachable";
  }

  if (latestStatus === "failed" || context.latestErrorMessage) {
    return "stream_failed";
  }

  if (latestStatus === "blocked") {
    return "guardrail_blocked";
  }

  if (latestStatus === "waiting_for_human") {
    return "human_confirmation_required";
  }

  if (context.isFirstVisit) {
    return "first_visit";
  }

  if (!context.hasSelectedAgent) {
    return "builder_empty";
  }

  if (!context.hasSystemPrompt) {
    return "agent_missing_prompt";
  }

  if (context.enabledToolCount === 0) {
    return "no_tools_selected";
  }

  if (context.route.includes("deploy") && !context.deploymentConfigured) {
    return "deployment_not_configured";
  }

  return undefined;
};

export const getGuideMessage = (
  context: GuideContext,
): GuideMessage | undefined => {
  const trigger = getGuideTrigger(context);

  return trigger ? GUIDE_MESSAGES[trigger] : undefined;
};

export const shouldShowGuideMessage = (
  message: GuideMessage | undefined,
  dismissedMessageIds: string[],
) => {
  if (!message) {
    return false;
  }

  if (isCriticalGuideTrigger(message.trigger)) {
    return true;
  }

  return !dismissedMessageIds.includes(message.id);
};
