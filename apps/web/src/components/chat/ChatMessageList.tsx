import type { ChatMessageViewModel } from "./ChatMessageBubble";
import { ChatMessageBubble } from "./ChatMessageBubble";
import styles from "./ChatMessageList.module.scss";

type ChatMessageListProps = {
  messages: ChatMessageViewModel[];
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <section className={styles.emptyState} aria-label="Порожній чат">
        <p className={styles.emptyKicker}>Повідомлень ще немає</p>
        <h2>Почніть з одного чіткого завдання для агента.</h2>
        <p>
          Цей інтерфейс готовий приймати реальні потокові події після
          підключення бекенду.
        </p>
      </section>
    );
  }

  return (
    <section
      className={styles.list}
      id="chat-messages"
      aria-label="Повідомлення чату"
    >
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}
