import { CheckCircle2, CircleAlert, Loader2, Wrench } from "lucide-react";
import styles from "./AgentThinkingPanel.module.scss";

export type ToolEventViewModel = {
  toolName: string;
  status: "running" | "success" | "error";
  output?: string;
};

type AgentThinkingPanelProps = {
  isThinking: boolean;
  toolEvents: ToolEventViewModel[];
};

const statusIcon = {
  running: Loader2,
  success: CheckCircle2,
  error: CircleAlert,
};

export function AgentThinkingPanel({
  isThinking,
  toolEvents,
}: AgentThinkingPanelProps) {
  return (
    <section className={styles.panel} aria-label="Активність агента">
      <div className={styles.header}>
        <span className={styles.iconWrap}>
          <Wrench size={18} aria-hidden />
        </span>
        <div>
          <h2>Активність агента</h2>
          <p>{isThinking ? "Планує наступний крок" : "Очікує завдання"}</p>
        </div>
      </div>

      <div className={styles.thinkingCard}>
        <span className={isThinking ? styles.pulse : styles.dot} />
        <div>
          <strong>{isThinking ? "Міркує" : "Тестовий режим"}</strong>
          <p>
            {isThinking
              ? "Агент готує відповідь і перевіряє, чи потрібен інструмент."
              : "Прикладові дані активні, доки потокова інтеграція ще підключається."}
          </p>
        </div>
      </div>

      <div className={styles.timeline}>
        {toolEvents.map((event, index) => {
          const Icon = statusIcon[event.status];

          return (
            <article className={styles.event} key={`${event.toolName}-${index}`}>
              <span className={`${styles.eventIcon} ${styles[event.status]}`}>
                <Icon size={16} aria-hidden />
              </span>
              <div>
                <h3>{event.toolName}</h3>
                <p>{event.output ?? "Очікування результату..."}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
