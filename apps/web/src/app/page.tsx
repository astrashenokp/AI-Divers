import { ArrowRight, MessageSquare, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.scss";

const productPoints = [
  "Налаштовуйте роль агента, його інструкції та правила роботи.",
  "Підключайте інструменти, які агент може використовувати під час відповіді.",
  "Тестуйте агента в чаті та бачте його кроки в реальному часі.",
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="home-title">
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Agentic Studio</span>

          <div className={styles.copy}>
            <h1 className={styles.title} id="home-title">
              Створюйте AI-агентів для реальних задач
            </h1>
            <p className={styles.subtitle}>
              AI Divers допомагає зібрати власного агента без написання
              backend-коду: описати його поведінку, підключити tools,
              перевірити відповіді в чаті та підготувати агента до
              використання в інших сервісах.
            </p>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.infoPanel} aria-label="Можливості додатка">
            <div className={styles.panelHeader}>
              <span className={styles.iconWrap}>
                <ShieldCheck size={22} aria-hidden />
              </span>
              <div>
                <h2>Для чого цей додаток</h2>
                <p>
                  Щоб перетворити звичайний AI-чат на налаштованого агента,
                  який працює за правилами, використовує інструменти й показує
                  процес виконання.
                </p>
              </div>
            </div>

            <ul className={styles.pointList}>
              {productPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <nav className={styles.navigationPanel} aria-label="Основні розділи">
            <Link className={styles.navCard} href="/tools">
              <span className={styles.navIcon}>
                <Wrench size={22} aria-hidden />
              </span>
              <span>
                <strong>Базові tools</strong>
                <small>Каталог інструментів для майбутнього налаштування.</small>
              </span>
              <ArrowRight size={18} aria-hidden />
            </Link>

            <Link className={styles.navCard} href="/chat">
              <span className={styles.navIcon}>
                <MessageSquare size={22} aria-hidden />
              </span>
              <span>
                <strong>Чат агента</strong>
                <small>Перевірка відповідей і live tracking активності.</small>
              </span>
              <ArrowRight size={18} aria-hidden />
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
