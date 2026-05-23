"use client";

import {
  type GuideActionHandlers,
  type UseAiDiverGuideOptions,
  useAiDiverGuide,
} from "@/hooks/useAiDiverGuide";
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
  guideActionHandlers?: GuideActionHandlers;
  guideContext?: UseAiDiverGuideOptions;
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
  guideActionHandlers,
  guideContext,
  toolsHref = "/tools",
}: AiDiverGuideProps) {
  const guide = useAiDiverGuide({
    context: guideContext,
    actionHandlers: guideActionHandlers,
  });
  const [uncontrolledCollapsed, setUncontrolledCollapsed] =
    useState(defaultCollapsed);
  const [isInstructionVisible, setIsInstructionVisible] = useState(false);
  const usesGuideLogic = guideContext !== undefined;
  const collapsed = usesGuideLogic
    ? !guide.isVisible || guide.isCollapsed
    : isCollapsed ?? uncontrolledCollapsed;

  const setCollapsed = (nextCollapsed: boolean) => {
    if (usesGuideLogic) {
      if (nextCollapsed) {
        guide.collapse();
      } else {
        guide.expand();
      }

      onCollapsedChange?.(nextCollapsed);
      return;
    }

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
  const guideActions: AiDiverAction[] = guide.actions.map((action) => ({
    id: action.id,
    label: action.label,
    onClick: () => {
      void guide.handleAction(action);
    },
  }));
  const displayedActions = usesGuideLogic
    ? guideActions
    : actions ?? defaultActions;
  const displayedTitle =
    usesGuideLogic && guide.message ? guide.message.title : title;
  const displayedBody =
    usesGuideLogic && guide.message ? guide.message.body : body;
  const shouldShowInstruction =
    !usesGuideLogic && actions === undefined && isInstructionVisible;

  return (
    <aside className={styles.guide} aria-label={ariaLabel}>
      <AiDiverMascot />
      <div className={styles.content}>
        <AiDiverBubble title={displayedTitle} body={displayedBody} />
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
                Для категорії &quot;Інше&quot; доступні базові tools: get_current_time,
                search_web, save_note, http_request.
              </li>
            </ol>
            <p>
              Зараз це демонстраційний UI. Реальне виконання повідомлень і
              підключення tools до backend пізніше з&apos;єднає integration layer.
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
        <AiDiverActionChips actions={displayedActions} />
      </div>
    </aside>
  );
}
