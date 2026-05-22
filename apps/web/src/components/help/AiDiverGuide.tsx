"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { AiDiverActionChips, type AiDiverAction } from "./AiDiverActionChips";
import { AiDiverBubble } from "./AiDiverBubble";
import { AiDiverMascot } from "./AiDiverMascot";
import styles from "./AiDiverGuide.module.scss";

type AiDiverGuideProps = {
  title: string;
  body: string;
  actions?: AiDiverAction[];
  isCollapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsedLabel?: string;
  ariaLabel?: string;
  explainHref?: string;
  toolsHref?: string;
};

export function AiDiverGuide({
  title,
  body,
  actions,
  isCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsedLabel = "DiverBot",
  ariaLabel = "DiverBot помічник",
  toolsHref = "/tools",
}: AiDiverGuideProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] =
    useState(defaultCollapsed);
  const [isInstructionVisible, setIsInstructionVisible] = useState(false);
  const collapsed = isCollapsed ?? uncontrolledCollapsed;

  const setCollapsed = (nextCollapsed: boolean) => {
    if (isCollapsed === undefined) {
      setUncontrolledCollapsed(nextCollapsed);
    }

    if (nextCollapsed) {
      setIsInstructionVisible(false);
    }

    onCollapsedChange?.(nextCollapsed);
  };

  if (collapsed) {
    return (
      <button
        className={styles.collapsedButton}
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Відкрити підказку DiverBot"
      >
        <HelpCircle size={18} aria-hidden />
        {collapsedLabel}
      </button>
    );
  }

  const defaultActions: AiDiverAction[] = [
    {
      id: "explain-chat",
      label: "Пояснити чат",
      onClick: () => setIsInstructionVisible(true),
    },
    {
      id: "open-tools",
      label: "Відкрити tools",
      href: toolsHref,
    },
    {
      id: "hide",
      label: "Сховати",
      onClick: () => setCollapsed(true),
    },
  ];
  const shouldShowInstruction = actions === undefined && isInstructionVisible;

  return (
    <aside className={styles.guide} aria-label={ariaLabel}>
      <AiDiverMascot />
      <div className={styles.content}>
        <AiDiverBubble title={title} body={body} />
        {shouldShowInstruction ? (
          <div className={styles.instructionPanel}>
            <strong>Як працює чат</strong>
            <ol>
              <li>Напишіть запит або задачу для агента в полі нижче.</li>
              <li>Агент відповість у цьому чаті.</li>
              <li>
                Якщо для відповіді потрібна дія, агент зможе використати
                підключені tools.
              </li>
              <li>
                Активність агента і tools буде видно у панелі Live Tracking.
              </li>
              <li>
                Для категорії “Інше” доступні базові tools: get_current_time,
                search_web, save_note, http_request.
              </li>
            </ol>
            <p>
              Зараз це демонстраційний UI. Реальне виконання повідомлень і
              підключення tools до backend пізніше з’єднає integration layer.
            </p>
            <button
              className={styles.instructionClose}
              type="button"
              onClick={() => setIsInstructionVisible(false)}
            >
              Зрозуміло
            </button>
          </div>
        ) : null}
        <AiDiverActionChips actions={actions ?? defaultActions} />
      </div>
    </aside>
  );
}
