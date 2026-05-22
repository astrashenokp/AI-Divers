"use client";

import { Bot, Home, MessageSquare, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppHeader.module.scss";

const navItems = [
  {
    href: "/",
    label: "Головна",
    icon: Home,
  },
  {
    href: "/tools",
    label: "Tools",
    icon: Wrench,
  },
  {
    href: "/chat",
    label: "Чат",
    icon: MessageSquare,
  },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="AI Divers головна">
        <span className={styles.brandIcon}>
          <Bot size={20} aria-hidden />
        </span>
        <span>
          <strong>AI Divers</strong>
          <small>Agentic Studio</small>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Основна навігація">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              className={styles.navLink}
              data-active={isActive}
              href={href}
              key={href}
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
