import {
  AgentThinkingPanel,
  type ToolEventViewModel,
} from "@/components/chat/AgentThinkingPanel";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import type { ChatMessageViewModel } from "@/components/chat/ChatMessageBubble";
import { AiDiverGuide } from "@/components/help/AiDiverGuide";
import { getToolCategory } from "@/app/tools/toolsData";
import styles from "./page.module.scss";

type ChatPageProps = {
  searchParams?: Promise<{
    domain?: string | string[];
    tool?: string | string[];
  }>;
};

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
  course_info: "Напишіть назву або ідентифікатор курсу, про який потрібні деталі.",
  save_progress: "Опишіть, який навчальний прогрес потрібно зберегти.",
  product_search: "Напишіть назву товару, категорію або ключові слова для пошуку.",
  order_status: "Напишіть номер замовлення або деталі, за якими його можна знайти.",
  check_price: "Напишіть назву або ідентифікатор товару, ціну якого потрібно перевірити.",
  get_current_time: "Напишіть часовий пояс або місто, для якого потрібно отримати поточний час.",
  search_web: "Опишіть, яку актуальну інформацію потрібно знайти в інтернеті.",
  save_note: "Напишіть нотатку або факт, який потрібно зберегти для поточної сесії.",
  http_request: "Опишіть публічний API, метод і дані запиту. Агент попросить підтвердження, якщо це потрібно.",
};

const getParamValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const getToolContext = (
  domainParam?: string | string[],
  toolParam?: string | string[],
): ToolContext | undefined => {
  const domain = getParamValue(domainParam);

  if (!domain) {
    return undefined;
  }

  const category = getToolCategory(domain);

  if (!category) {
    return undefined;
  }

  const requestedTool = getParamValue(toolParam);
  const tool = requestedTool
    ? category.tools.find((item) => item.name === requestedTool)
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

function ChatComposerArea({ toolContext }: { toolContext?: ToolContext }) {
  return (
    <>
      <ToolContextBanner context={toolContext} />
      <AiDiverGuide
        title="Перше занурення у Agentic Studio?"
        body="Я допоможу розібратися з чатом агента."
      />
      <ChatComposer />
    </>
  );
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolvedSearchParams = await searchParams;
  const toolContext = getToolContext(
    resolvedSearchParams?.domain,
    resolvedSearchParams?.tool,
  );

  return (
    <ChatLayout
      header={
        <ChatHeader
          title="AI Divers Agent"
          subtitle="Тестовий чат із видимою активністю агента"
          isStreaming
        />
      }
      messages={<ChatMessageList messages={mockMessages} />}
      activity={<AgentThinkingPanel isThinking toolEvents={mockToolEvents} />}
      composer={<ChatComposerArea toolContext={toolContext} />}
    />
  );
}
