import type { ReactNode } from "react";
import styles from "./ChatLayout.module.scss";

type ChatLayoutProps = {
  header: ReactNode;
  messages: ReactNode;
  activity: ReactNode;
  composer: ReactNode;
};

export function ChatLayout({
  header,
  messages,
  activity,
  composer,
}: ChatLayoutProps) {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="Чат AI Divers">
        <div className={styles.chatPanel}>
          {header}
          {messages}
          {composer}
        </div>
        <aside className={styles.activityPanel}>{activity}</aside>
      </section>
    </main>
  );
}
