import { Bot, UserRound } from "lucide-react";
import styles from "./ChatMessageBubble.module.scss";

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessageViewModel = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  isError?: boolean;
};

type ChatMessageBubbleProps = {
  message: ChatMessageViewModel;
};

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const bubbleClassName = [
    styles.bubble,
    isUser ? styles.userBubble : styles.assistantBubble,
    isSystem ? styles.systemBubble : "",
    message.isError ? styles.errorBubble : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={`${styles.message} ${isUser ? styles.user : ""}`}>
      <span className={styles.avatar} aria-hidden>
        {isUser ? <UserRound size={18} /> : <Bot size={18} />}
      </span>

      <div className={bubbleClassName}>
        <p>{message.content}</p>
        <div className={styles.meta}>
          <span>{message.createdAt}</span>
          {message.isStreaming ? <span>пише...</span> : null}
        </div>
      </div>
    </article>
  );
}
