"use client";

import { ArrowLeft, Code2, Globe2, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import styles from "./page.module.scss";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const slugFromAgentId = (agentId: string | null) =>
  agentId ? `agent-${agentId.slice(0, 8)}` : "agent-preview";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button className={styles.copyButton} type="button" onClick={handleCopy}>
      {copied ? "Скопійовано" : "Копіювати"}
    </button>
  );
}

function DeployPageContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const deploymentSlug = slugFromAgentId(agentId);
  const restEndpoint = `${apiBaseUrl}/api/v1/public/agents/${deploymentSlug}/execute`;
  const widgetConfigUrl = `${apiBaseUrl}/api/v1/public/widgets/${deploymentSlug}/config`;
  const iframeCode = `<iframe src="${apiBaseUrl}/widget/${deploymentSlug}" width="400" height="600"></iframe>`;

  const deploymentOptions = useMemo(
    () => [
      {
        title: "REST API",
        description:
          "Для власного застосунку або backend, який хоче викликати агента програмно.",
        icon: Code2,
        label: "Endpoint",
        value: restEndpoint,
        helper: 'POST з body: { "message": "Ваш запит до агента" }',
      },
      {
        title: "Widget / iframe",
        description:
          "Для вставки чат-агента на зовнішній сайт без додаткового frontend-коду.",
        icon: PanelsTopLeft,
        label: "Embed code",
        value: iframeCode,
        helper: `Widget config: ${widgetConfigUrl}`,
      },
    ],
    [iframeCode, restEndpoint, widgetConfigUrl],
  );

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="deploy-title">
        <div className={styles.navRow}>
          <Link className={styles.backLink} href="/chat">
            <ArrowLeft size={18} aria-hidden />
            До чату
          </Link>
          <Link className={styles.backLink} href="/">
            На головну
          </Link>
        </div>

        <header className={styles.header}>
          <span className={styles.iconWrap}>
            <Globe2 size={30} aria-hidden />
          </span>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>Deploy Anywhere</span>
            <h1 id="deploy-title">Опублікувати агента</h1>
            <p>
              Після публікації агент може працювати поза Studio: через REST API,
              або вбудований widget. Ця сторінка показує, що користувач
              має скопіювати після налаштування deployment.
            </p>
          </div>
          <div className={styles.headerStats}>
            <span>agentId</span>
            <strong>{agentId ?? "не обрано"}</strong>
          </div>
        </header>

        <section className={styles.deploySummary} aria-label="Статус deployment">
          <div>
            <span className={styles.summaryLabel}>deploymentSlug</span>
            <strong>{deploymentSlug}</strong>
          </div>
          <p>
            Зараз це frontend preview. Поліна пізніше підставить реальний slug і
            статуси з backend через deployment settings endpoint.
          </p>
        </section>

        <section className={styles.optionGrid} aria-label="Варіанти deployment">
          {deploymentOptions.map(({ title, description, icon: Icon, label, value, helper }) => (
            <article className={styles.optionCard} key={title}>
              <div className={styles.optionTitleRow}>
                <span className={styles.optionIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </div>

              <div className={styles.snippetBlock}>
                <span>{label}</span>
                <code>{value}</code>
              </div>

              <div className={styles.cardFooter}>
                <p>{helper}</p>
                <CopyButton value={value} />
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default function DeployPage() {
  return (
    <Suspense fallback={null}>
      <DeployPageContent />
    </Suspense>
  );
}
