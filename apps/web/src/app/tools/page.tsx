import { ArrowLeft, BookOpen, Landmark, ShoppingBag, Wrench, Map } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.scss";

const toolCategories = [
  {
    title: "Освіта",
    description: "Інструменти для навчальних асистентів і пошуку знань.",
    icon: BookOpen,
  },
  {
    title: "Інше",
    description: "Перейти до спілкування з AI-чатом",
    icon: ShoppingBag,
  },
  {
    title: "Туризм",
    description: "Інструменти для маршрутів, подорожей і рекомендацій.",
    icon: Map,
  },
  {
    title: "E-commerce (Продажі)",
    description: "Інструменти для фінансових даних і звітів.",
    icon: Landmark,
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
