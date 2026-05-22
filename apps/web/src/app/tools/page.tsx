import { ArrowLeft, Wrench } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.scss";

export default function ToolsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="tools-title">
        <Link className={styles.backLink} href="/">
          <ArrowLeft size={18} aria-hidden />
          На головну
        </Link>

        <div className={styles.emptyState}>
          <span className={styles.iconWrap}>
            <Wrench size={28} aria-hidden />
          </span>
          <h1 id="tools-title">Базові tools</h1>
          <p>Тут буде список інструментів, які можна підключати до агента.</p>
        </div>
      </section>
    </main>
  );
}
