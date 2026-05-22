import {
  ArrowLeft,
  BookOpen,
  Compass,
  MessageSquare,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.scss";

const toolCategories = [
  {
    title: "Освіта",
    description: "Інструменти для навчальних асистентів, пояснень і пошуку знань.",
    icon: BookOpen,
  },
  {
    title: "Туризм",
    description: "Інструменти для маршрутів, подорожей, місць і рекомендацій.",
    icon: Compass,
  },
  {
    title: "E-commerce (Продажі)",
    description: "Інструменти для товарів, замовлень, продажів і клієнтських запитів.",
    icon: ShoppingBag,
  },
  {
    title: "Інше",
    description: "Загальні інструменти для задач, які не входять в основні категорії.",
    icon: MessageSquare,
  },
];

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
              Тут будуть категорії інструментів, які можна підключати до
              агента. Детальне налаштування зʼявиться пізніше.
            </p>
          </div>
        </div>

        <div className={styles.categoryGrid}>
          {toolCategories.map(({ title, description, icon: Icon }) => (
            <article className={styles.categoryCard} key={title}>
              <span className={styles.categoryIcon}>
                <Icon size={22} aria-hidden />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
