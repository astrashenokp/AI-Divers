import { ArrowLeft, Bot, Radio, Rocket } from "lucide-react";
import Link from "next/link";
import styles from "./ChatHeader.module.scss";

type ChatHeaderProps = {
  title: string;
  subtitle: string;
  isStreaming: boolean;
  deployHref?: string;
};

export function ChatHeader({
  title,
  subtitle,
  isStreaming,
  deployHref,
}: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.leftSide}>
        <Link className={styles.backLink} href="/" aria-label="Повернутися на головну">
          <ArrowLeft size={18} aria-hidden />
        </Link>

        <div className={styles.identity}>
          <span className={styles.iconWrap}>
            <Bot size={22} aria-hidden />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        {deployHref ? (
          <Link className={styles.deployLink} href={deployHref}>
            <Rocket size={16} aria-hidden />
            Опублікувати агента
          </Link>
        ) : null}
        <span className={styles.status}>
          <Radio size={16} aria-hidden />
          {isStreaming ? "Відповідь у процесі" : "Готово"}
        </span>
      </div>
    </header>
  );
}
