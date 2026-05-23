"use client";

import { ArrowLeft, Code2, Globe2, PanelsTopLeft, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useEffect } from "react";
import styles from "./page.module.scss";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const slugFromAgentId = (agentId: string | null) =>
  agentId ? `agent-${agentId.slice(0, 8)}` : "agent-preview";

interface DeploymentInfo {
  deploymentSlug: string;
  restEnabled: boolean;
  webhookEnabled: boolean;
  widgetEnabled: boolean;
  publicAccessEnabled: boolean;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button className={styles.copyButton} type="button" onClick={handleCopy}>
      {copied ? "Скопійовано ✓" : "Копіювати"}
    </button>
  );
}

function DeployPageContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");

  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    fetch(`${apiBaseUrl}/api/v1/agents/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.deployment?.deploymentSlug) {
          setDeployment(data.deployment);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  const deploymentSlug = deployment?.deploymentSlug ?? slugFromAgentId(agentId);
  const isPublished = !!(deployment?.publicAccessEnabled || deployment?.restEnabled);

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
        label: "ENDPOINT",
        value: restEndpoint,
        helper: 'POST з body: { "message": "Ваш запит до агента" }',
        enabled: deployment?.restEnabled ?? true,
      },
      {
        title: "Widget / iframe",
        description:
          "Для вставки чат-агента на зовнішній сайт без додаткового frontend-коду.",
        icon: PanelsTopLeft,
        label: "EMBED CODE",
        value: iframeCode,
        helper: `Widget config: ${widgetConfigUrl}`,
        enabled: deployment?.widgetEnabled ?? true,
      },
    ],
    [iframeCode, restEndpoint, widgetConfigUrl, deployment],
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
              або вбудований widget. Скопіюйте потрібний endpoint або embed-код нижче.
            </p>
          </div>
          <div className={styles.headerStats}>
            <span>agentId</span>
            <strong>{agentId ?? "не обрано"}</strong>
          </div>
        </header>

        <section className={styles.deploySummary} aria-label="Статус deployment">
          <div>
            <span className={styles.summaryLabel}>DEPLOYMENTSLUG</span>
            <strong>{deploymentSlug}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {loading ? (
              <>
                <Clock size={16} style={{ color: "#888" }} />
                <span style={{ color: "#888", fontSize: "14px" }}>Завантаження статусу...</span>
              </>
            ) : isPublished ? (
              <>
                <CheckCircle2 size={16} style={{ color: "#0d9488" }} />
                <span style={{ color: "#0d9488", fontSize: "14px", fontWeight: 600 }}>
                  Агент опублікований і доступний публічно
                </span>
              </>
            ) : (
              <>
                <Clock size={16} style={{ color: "#888" }} />
                <span style={{ color: "#888", fontSize: "14px" }}>
                  Чернетка — налаштуйте deployment щоб опублікувати
                </span>
              </>
            )}
          </div>
        </section>

        <section className={styles.optionGrid} aria-label="Варіанти deployment">
          {deploymentOptions.map(({ title, description, icon: Icon, label, value, helper, enabled }) => (
            <article className={styles.optionCard} key={title} style={{ opacity: enabled ? 1 : 0.65 }}>
              <div className={styles.optionTitleRow}>
                <span className={styles.optionIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <h2>
                    {title}{" "}
                    {enabled && (
                      <CheckCircle2
                        size={14}
                        style={{ color: "#0d9488", display: "inline", verticalAlign: "middle" }}
                      />
                    )}
                  </h2>
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
