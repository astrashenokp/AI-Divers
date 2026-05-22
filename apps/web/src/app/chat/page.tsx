import { SendHorizontal } from "lucide-react";
import {
  AgentThinkingPanel,
  type ToolEventViewModel,
} from "@/components/chat/AgentThinkingPanel";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import type { ChatMessageViewModel } from "@/components/chat/ChatMessageBubble";
import styles from "./page.module.scss";

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
    content: "Перевіряю, чи допоможе збережена нотатка або інструмент часу...",
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
    toolName: "web_search",
    status: "error",
    output: "Недоступно в тестовому режимі.",
  },
];

function ComposerPlaceholder() {
  return (
    <section className={styles.composer} aria-label="Поле введення повідомлення">
      <span className={styles.composerLabel}>Повідомлення</span>
      <div className={styles.composerBox}>
        <span>Тут буде поле для реального повідомлення та потокової відповіді.</span>
        <button className={styles.sendButton} type="button" disabled>
          <SendHorizontal size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}

export default function ChatPage() {
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
      composer={<ComposerPlaceholder />}
    />
  );
}
