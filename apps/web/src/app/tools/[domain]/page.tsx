import { ArrowLeft, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../page.module.scss";
import { getToolCategory, toolCategories } from "../toolsData";

type ToolCategoryPageProps = {
  params: Promise<{
    domain: string;
  }>;
};

export function generateStaticParams() {
  return toolCategories.map((category) => ({
    domain: category.domain,
  }));
}

export default async function ToolCategoryPage({
  params,
}: ToolCategoryPageProps) {
  const { domain } = await params;
  const category = getToolCategory(domain);

  if (!category) {
    notFound();
  }

  const CategoryIcon = category.icon;

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="category-title">
        <div className={styles.navRow}>
          <Link className={styles.backLink} href="/tools">
            <ArrowLeft size={18} aria-hidden />
            До категорій
          </Link>
          <Link className={styles.backLink} href="/">
            На головну
          </Link>
        </div>

        <div className={styles.header}>
          <span className={styles.iconWrap}>
            <CategoryIcon size={28} aria-hidden />
          </span>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>domain: {category.domain}</span>
            <h1 id="category-title">{category.title}</h1>
            <p>{category.description}</p>
          </div>
          <div className={styles.headerStats} aria-label="Метадані категорії">
            <span>{category.tools.length} tools</span>
            <strong>{category.maxSteps} max steps</strong>
          </div>
        </div>

        <section className={styles.categorySection} aria-labelledby="tools-list-title">
          <div className={styles.categoryHeader}>
            <span className={styles.categoryIcon}>
              <Wrench size={22} aria-hidden />
            </span>
            <div>
              <h2 id="tools-list-title">Доступні tools</h2>
            </div>
          </div>

          <div className={styles.metaRow} aria-label={`Метадані ${category.title}`}>
            <span>domain: {category.domain}</span>
            <span>{category.tools.length} tools</span>
            <span>max steps: {category.maxSteps}</span>
          </div>

          <div className={styles.toolGrid}>
            {category.tools.map((tool) => {
              const ToolIcon = tool.icon;

              return (
                <article className={styles.toolCard} key={tool.name}>
                  <div className={styles.toolTitleRow}>
                    <span className={styles.toolIcon}>
                      <ToolIcon size={18} aria-hidden />
                    </span>
                    <h3>{tool.name}</h3>
                  </div>
                  <p>{tool.description}</p>
                  {tool.requiresConfirmation ? (
                    <span className={styles.confirmationBadge}>
                      потребує підтвердження
                    </span>
                  ) : (
                    <span className={styles.readyBadge}>
                      доступний у домені
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
