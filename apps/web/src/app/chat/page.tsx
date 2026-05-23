"use client";

import { getToolCategory } from "@/app/tools/toolsData";
import {
  AgentThinkingPanel,
  type ToolEventViewModel,
} from "@/components/chat/AgentThinkingPanel";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatLayout } from "@/components/chat/ChatLayout";
import type { ChatMessageViewModel } from "@/components/chat/ChatMessageBubble";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { AiDiverGuide } from "@/components/help/AiDiverGuide";
import { useAgents } from "@/hooks/useAgents";
import { useAgentExecutionStream } from "@/hooks/useAgentExecutionStream";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { LIVE_TRACKING_EVENTS } from "@/lib/constants";
import type { ChatMessage, LiveTrackingEvent } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
} from "react";
import styles from "./page.module.scss";

type AiDiverGuideProps = ComponentProps<typeof AiDiverGuide>;

type ToolContext = {
  categoryTitle: string;
  domain: string;
  toolName?: string;
  instruction: string;
};

const toolInstructions: Record<string, string> = {
  itinerary_plan: "Опишіть місто, тривалість, дати та стиль подорожі.",
  hotel_search: "Напишіть місто, дати заїзду й виїзду та кількість гостей.",
  get_weather: "Напишіть місто і період, для якого потрібен прогноз погоди.",
  course_search: "Опишіть тему, навичку або рівень складності курсу.",
  course_info:
    "Напишіть назву або ідентифікатор курсу, про який потрібні деталі.",
  save_progress: "Опишіть, який навчальний прогрес потрібно зберегти.",
  product_search:
    "Напишіть назву товару, категорію або ключові слова для пошуку.",
  order_status:
    "Напишіть номер замовлення або деталі, за якими його можна знайти.",
  check_price:
    "Напишіть назву або ідентифікатор товару, ціну якого потрібно перевірити.",
  get_current_time:
    "Напишіть часовий пояс або місто, для якого потрібно отримати поточний час.",
  search_web:
    "Опишіть, яку актуальну інформацію потрібно знайти в інтернеті.",
  save_note:
    "Напишіть нотатку або факт, який потрібно зберегти для поточної сесії.",
  http_request:
    "Опишіть публічний API, метод і дані запиту. Агент попросить підтвердження, якщо це потрібно.",
};

const getToolContext = (
  domain?: string | null,
  toolName?: string | null,
): ToolContext | undefined => {
  if (!domain) {
    return undefined;
  }

  const category = getToolCategory(domain);

  if (!category) {
    return undefined;
  }

  const tool = toolName
    ? category.tools.find((item) => item.name === toolName)
    : undefined;

  return {
    categoryTitle: category.title,
    domain: category.domain,
    toolName: tool?.name,
    instruction: tool
      ? toolInstructions[tool.name] ??
        "Опишіть задачу, і агент використає цей tool, якщо він потрібен."
      : "Опишіть задачу, і агент використає доступні tools цієї категорії, якщо вони потрібні.",
  };
};

const formatMessageTime = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toMessageViewModel = (message: ChatMessage): ChatMessageViewModel => ({
  id: message.id,
  role:
    message.role === "user" ||
    message.role === "assistant" ||
    message.role === "system"
      ? message.role
      : "assistant",
  content: message.content,
  createdAt: formatMessageTime(message.createdAt),
});

const toToolEventStatus = (
  event: LiveTrackingEvent,
): ToolEventViewModel["status"] => {
  if (
    event.type === LIVE_TRACKING_EVENTS.EXECUTION_FAILED ||
    event.status === "failed" ||
    event.status === "blocked"
  ) {
    return "error";
  }

  if (
    event.type === LIVE_TRACKING_EVENTS.TOOL_CALL_FINISHED ||
    event.type === LIVE_TRACKING_EVENTS.EXECUTION_COMPLETED ||
    event.status === "completed"
  ) {
    return "success";
  }

  return "running";
};

const toToolEventViewModel = (
  event: LiveTrackingEvent,
  index: number,
): ToolEventViewModel => ({
  toolName: event.toolName ?? event.type,
  status: toToolEventStatus(event),
  output: event.summary || `Event ${index + 1}`,
});

const mockMessages: ChatMessageViewModel[] = [
  {
    id: "msg-1",
    role: "system",
    content:
      "Тестовий режим активний. Чат використовує прикладові дані, доки потокова відповідь бекенду ще підключається.",
    createdAt: "09:00",
  },
  {
    id: "msg-2",
    role: "user",
    content:
      "Допоможи налаштувати агента, який аналізує запит клієнта і пропонує наступну дію.",
    createdAt: "09:01",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "Я можу побудувати такий сценарій: визначити ціль користувача, обрати потрібний інструмент, показати результат і коротко підсумувати наступний крок.",
    createdAt: "09:01",
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Перевіряю, чи допоможе збережена нотатка або інструмент часу...",
    createdAt: "09:02",
    isStreaming: true,
  },
];

const mockToolEvents: ToolEventViewModel[] = [
  {
    toolName: "get_current_time",
    status: "success",
    output: "Повернув поточний локальний час для цієї сесії.",
  },
  {
    toolName: "save_note",
    status: "running",
    output: "Готую коротку нотатку з продуктовим висновком.",
  },
  {
    toolName: "search_web",
    status: "error",
    output: "Недоступно в тестовому режимі.",
  },
];

function ToolContextBanner({ context }: { context?: ToolContext }) {
  if (!context) {
    return null;
  }

  return (
    <section className={styles.toolContext} aria-label="Контекст обраного tool">
      <div className={styles.toolContextMeta}>
        <span>domain: {context.domain}</span>
        {context.toolName ? <span>tool: {context.toolName}</span> : null}
      </div>
      <strong>
        {context.toolName
          ? `Обрано tool: ${context.toolName}`
          : `Обрано категорію: ${context.categoryTitle}`}
      </strong>
      <p>{context.instruction}</p>
    </section>
  );
}

function ChatComposerArea({
  draftMessage,
  guideActionHandlers,
  guideContext,
  isSending,
  isDisabled,
  toolContext,
  onDraftChange,
  onSubmit,
}: {
  draftMessage: string;
  guideActionHandlers: NonNullable<AiDiverGuideProps["guideActionHandlers"]>;
  guideContext: NonNullable<AiDiverGuideProps["guideContext"]>;
  isSending: boolean;
  isDisabled: boolean;
  toolContext?: ToolContext;
  onDraftChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <>
      <ToolContextBanner context={toolContext} />
      <AiDiverGuide
        title="Перше занурення у Agentic Studio?"
        body="Я допоможу розібратися з чатом агента."
        guideActionHandlers={guideActionHandlers}
        guideContext={guideContext}
      />
      <ChatComposer
        value={draftMessage}
        disabled={isDisabled}
        isSending={isSending}
        onChange={onDraftChange}
        onSubmit={onSubmit}
      />
    </>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [draftMessage, setDraftMessage] = useState("");
  const { selectedAgent, isLoading: isAgentsLoading, error: agentsError } =
    useAgents();
  const {
    session,
    startSession,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useAgentSession(selectedAgent?.id);
  const {
    messages,
    executionEvents,
    streamedMessage,
    isStreaming,
    isThinking,
    error: executionError,
    startExecution,
  } = useAgentExecutionStream(selectedAgent?.id, session?.id);
  const {
    isBackendReachable,
    error: healthError,
    refreshHealth,
  } = useBackendHealth();

  const toolContext = useMemo(
    () => getToolContext(searchParams.get("domain"), searchParams.get("tool")),
    [searchParams],
  );
  const runChatMessage = useCallback(
    async (message: string, options: { forceMock?: boolean } = {}) => {
      if (!selectedAgent) {
        setDraftMessage(message);
        return;
      }

      const activeSession =
        session ?? (await startSession(`${selectedAgent.name} test chat`));
      const metadata: Record<string, string> = {};
      const domain = toolContext?.domain ?? selectedAgent.tools[0]?.category;

      if (domain) {
        metadata.domain = domain;
      }

      if (toolContext?.toolName) {
        metadata.tool = toolContext.toolName;
      }

      setDraftMessage("");
      await startExecution(message, {
        sessionId: activeSession.id,
        metadata,
        forceMock: options.forceMock,
      });
    },
    [selectedAgent, session, startExecution, startSession, toolContext],
  );
  const latestExecutionEvent = executionEvents.at(-1);
  const guideContext = useMemo<NonNullable<AiDiverGuideProps["guideContext"]>>(
    () => ({
      hasSelectedAgent: Boolean(selectedAgent),
      hasSystemPrompt: Boolean(selectedAgent?.systemPrompt.trim()),
      enabledToolCount:
        selectedAgent?.tools.filter((tool) => tool.enabled).length ?? 0,
      backendReachable: healthError ? false : isBackendReachable ? true : null,
      isStreaming,
      latestExecutionStatus:
        latestExecutionEvent?.status === "idle"
          ? undefined
          : latestExecutionEvent?.status,
      latestErrorMessage:
        executionError?.message ??
        sessionError?.message ??
        agentsError?.message ??
        healthError?.message,
      deploymentConfigured: Boolean(
        selectedAgent?.deployment.publicAccessEnabled ||
          selectedAgent?.deployment.restEnabled ||
          selectedAgent?.deployment.webhookEnabled ||
          selectedAgent?.deployment.widgetEnabled,
      ),
    }),
    [
      agentsError?.message,
      executionError?.message,
      healthError,
      isBackendReachable,
      isStreaming,
      latestExecutionEvent?.status,
      selectedAgent,
      sessionError?.message,
    ],
  );
  const guideActionHandlers = useMemo<
    NonNullable<AiDiverGuideProps["guideActionHandlers"]>
  >(
    () => ({
      check_backend_health: () => {
        void refreshHealth();
      },
      retry_stream: () => {
        setDraftMessage("Повтори останній тест агента.");
      },
      run_mock_mode: () => {
        void runChatMessage("Запусти демо-приклад у демо-режимі.", {
          forceMock: true,
        });
      },
      insert_template: () => {
        setDraftMessage(
          "Допоможи налаштувати агента з чіткою роллю, одним tool і безпечними guardrails.",
        );
      },
      add_default_tool: () => {
        setDraftMessage("Покажи, який базовий tool варто додати цьому агенту.");
      },
      set_safe_guardrails: () => {
        setDraftMessage("Поясни безпечні guardrails для цього агента.");
      },
      open_widget_preview: () => {
        setDraftMessage(
          "Поясни, як підготувати widget deployment для цього агента.",
        );
      },
      explain_screen: () => {
        setDraftMessage("Поясни, що робити на цьому екрані Agentic Studio.");
      },
      start_guided_setup: () => {
        setDraftMessage(
          "Проведи мене через перше налаштування агента в Agentic Studio.",
        );
      },
    }),
    [refreshHealth, runChatMessage],
  );

  const messagesViewModel = useMemo<ChatMessageViewModel[]>(() => {
    const baseMessages =
      messages.length > 0 ? messages.map(toMessageViewModel) : mockMessages;
    const nextMessages = [...baseMessages];

    if (isStreaming && streamedMessage) {
      nextMessages.push({
        id: "streaming-assistant-message",
        role: "assistant",
        content: streamedMessage,
        createdAt: "now",
        isStreaming: true,
      });
    }

    const error = executionError ?? sessionError ?? agentsError;

    if (error) {
      nextMessages.push({
        id: "integration-error-message",
        role: "system",
        content: error.message,
        createdAt: "now",
        isError: true,
      });
    }

    return nextMessages;
  }, [
    agentsError,
    executionError,
    isStreaming,
    messages,
    sessionError,
    streamedMessage,
  ]);

  const toolEvents = useMemo<ToolEventViewModel[]>(
    () =>
      executionEvents.length > 0
        ? executionEvents.slice(-8).map(toToolEventViewModel)
        : mockToolEvents,
    [executionEvents],
  );

  const isBusy = isStreaming || isSessionLoading || isAgentsLoading;
  const isComposerDisabled = isBusy;

  const handleSubmit = async (message: string) => {
    await runChatMessage(message, { forceMock: !selectedAgent });
  };

  return (
    <ChatLayout
      header={
        <ChatHeader
          title={selectedAgent?.name ?? "AI Divers Agent"}
          subtitle="Тестовий чат із видимою активністю агента"
          isStreaming={isStreaming || isAgentsLoading}
        />
      }
      messages={<ChatMessageList messages={messagesViewModel} />}
      activity={
        <AgentThinkingPanel
          isThinking={isThinking || executionEvents.length === 0}
          toolEvents={toolEvents}
        />
      }
      composer={
        <ChatComposerArea
          draftMessage={draftMessage}
          guideActionHandlers={guideActionHandlers}
          guideContext={guideContext}
          isSending={isBusy}
          isDisabled={isComposerDisabled}
          toolContext={toolContext}
          onDraftChange={setDraftMessage}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
