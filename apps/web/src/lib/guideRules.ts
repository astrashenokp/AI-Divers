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
    title: "Перше занурення?",
    body: "Я допоможу створити першого агента або швидко розібратися з проблемою.",
    actions: [
      action("start-guided-setup", "Створити агента", "start_guided_setup"),
      action("explain-screen", "Пояснити екран", "explain_screen"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  builder_empty: {
    id: "guide-builder-empty",
    trigger: "builder_empty",
    title: "Почніть з ролі",
    body: "Оберіть шаблон або напишіть чітку роль для агента.",
    actions: [
      action("insert-template", "Вставити шаблон", "insert_template"),
      action("explain-screen", "Пояснити builder", "explain_screen"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  agent_missing_prompt: {
    id: "guide-agent-missing-prompt",
    trigger: "agent_missing_prompt",
    title: "Додайте system prompt",
    body: "Чіткий system prompt пояснює агенту, як поводитися перед використанням tools.",
    actions: [
      action("insert-template", "Вставити шаблон", "insert_template"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  no_tools_selected: {
    id: "guide-no-tools-selected",
    trigger: "no_tools_selected",
    title: "Додайте хоча б один tool",
    body: "Агент уже може відповідати, але ще не може діяти. Додайте tool, щоб показати справжню agentic-поведінку.",
    actions: [
      action("add-default-tool", "Додати базовий tool", "add_default_tool"),
      action("explain-screen", "Пояснити tools", "explain_screen"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  backend_unreachable: {
    id: "guide-backend-unreachable",
    trigger: "backend_unreachable",
    title: "Бекенд недоступний",
    body: "Я не можу підключитися до бекенду. Можна перевірити health endpoint або продовжити в демо-режимі.",
    actions: [
      action("check-backend-health", "Перевірити бекенд", "check_backend_health"),
      action("run-mock-mode", "Запустити демо-режим", "run_mock_mode"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  stream_failed: {
    id: "guide-stream-failed",
    trigger: "stream_failed",
    title: "Live stream зупинився",
    body: "Потік подій зупинився неочікувано. Можна повторити спробу або перейти в демо-режим.",
    actions: [
      action("retry-stream", "Повторити", "retry_stream"),
      action("run-mock-mode", "Запустити демо-режим", "run_mock_mode"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  guardrail_blocked: {
    id: "guide-guardrail-blocked",
    trigger: "guardrail_blocked",
    title: "Guardrail заблокував запуск",
    body: "Guardrail зупинив виконання. Перевірте заблоковану тему або зменшіть ризик запиту.",
    actions: [
      action("explain-screen", "Пояснити guardrails", "explain_screen"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  human_confirmation_required: {
    id: "guide-human-confirmation-required",
    trigger: "human_confirmation_required",
    title: "Потрібне підтвердження",
    body: "Ця дія потребує підтвердження людини, перш ніж агент продовжить.",
    actions: [
      action("explain-screen", "Пояснити підтвердження", "explain_screen"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  deployment_not_configured: {
    id: "guide-deployment-not-configured",
    trigger: "deployment_not_configured",
    title: "Deployment не налаштовано",
    body: "Агент працює в Studio. Увімкніть widget або API deployment, щоб використовувати його зовні.",
    actions: [
      action("open-widget-preview", "Відкрити widget preview", "open_widget_preview"),
      action("dismiss", "Сховати", "dismiss"),
    ],
  },
  demo_mode: {
    id: "guide-demo-mode",
    trigger: "demo_mode",
    title: "Демо-шлях готовий",
    body: "Використайте демо-режим, щоб безпечно створити агента, запустити тест, показати Live Tracking і preview deployment.",
    actions: [
      action("start-guided-setup", "Почати демо-шлях", "start_guided_setup"),
      action("dismiss", "Сховати", "dismiss"),
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

  if (latestStatus === "blocked") {
    return "guardrail_blocked";
  }

  if (latestStatus === "waiting_for_human") {
    return "human_confirmation_required";
  }

  if (latestStatus === "failed" || context.latestErrorMessage) {
    return "stream_failed";
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
