import { ArrowLeft, Wrench } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.scss";
import { toolCategories } from "./toolsData";

export default function ToolsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="tools-title">
        <Link className={styles.backLink} href="/">
          <ArrowLeft size={18} aria-hidden />
          На головну
        </Link>

        <div className={styles.header}>
          <span className={styles.iconWrap}>
            <Wrench size={28} aria-hidden />
          </span>
          <div>
            <h1 id="tools-title">Базові tools</h1>
            <p>
              Оберіть категорію, щоб переглянути доступні tools з
              agent-service, їх backend domain і базові guardrails.
            </p>
          </div>
        </div>

        <div className={styles.categoryGrid}>
          {toolCategories.map(({ title, description, domain, icon: Icon }) => (
            <Link
              className={styles.categoryCard}
              href={`/tools/${domain}`}
              key={domain}
            >
              <span className={styles.categoryIcon}>
                <Icon size={22} aria-hidden />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
              <span className={styles.cardAction}>Переглянути tools</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
