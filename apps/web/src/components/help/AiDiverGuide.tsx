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
  explainHref = "#chat-messages",
  toolsHref = "/tools",
}: AiDiverGuideProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] =
    useState(defaultCollapsed);
  const collapsed = isCollapsed ?? uncontrolledCollapsed;

  const setCollapsed = (nextCollapsed: boolean) => {
    if (isCollapsed === undefined) {
      setUncontrolledCollapsed(nextCollapsed);
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
      href: explainHref,
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

  return (
    <aside className={styles.guide} aria-label={ariaLabel}>
      <AiDiverMascot />
      <div className={styles.content}>
        <AiDiverBubble title={title} body={body} />
        <AiDiverActionChips actions={actions ?? defaultActions} />
      </div>
    </aside>
  );
}
