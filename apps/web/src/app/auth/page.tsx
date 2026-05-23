"use client";

import { FormEvent, Suspense, useState } from "react";
import { Bot, LogIn, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.scss";

type AuthMode = "login" | "register";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isLoading, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const redirectTo = searchParams.get("next") || "/chat";
  const isRegisterMode = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const credentials = {
      username: username.trim(),
      password,
    };

    if (!credentials.username || !credentials.password) {
      return;
    }

    if (isRegisterMode) {
      await register(credentials);
    } else {
      await login(credentials);
    }

    router.push(redirectTo);
  };

  return (
    <main className={styles.page}>
      <section className={styles.authPanel} aria-labelledby="auth-title">
        <div className={styles.intro}>
          <span className={styles.icon}>
            <Bot size={28} aria-hidden />
          </span>
          <div>
            <p className={styles.eyebrow}>AI Divers</p>
            <h1 id="auth-title">
              {isRegisterMode ? "Створіть акаунт" : "Увійдіть в акаунт"}
            </h1>
            <p>
              Авторизація потрібна, щоб backend міг прив’язати агентів, чати,
              sessionId і Live Tracking до вашого користувача.
            </p>
          </div>
        </div>

        <div className={styles.modeSwitch} role="tablist" aria-label="Режим авторизації">
          <button
            aria-selected={!isRegisterMode}
            role="tab"
            type="button"
            onClick={() => setMode("login")}
          >
            <LogIn size={16} aria-hidden />
            Вхід
          </button>
          <button
            aria-selected={isRegisterMode}
            role="tab"
            type="button"
            onClick={() => setMode("register")}
          >
            <UserPlus size={16} aria-hidden />
            Реєстрація
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            <span>Логін</span>
            <input
              autoComplete="username"
              disabled={isLoading}
              name="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            <span>Пароль</span>
            <input
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
              disabled={isLoading}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className={styles.error}>{error.message}</p> : null}

          <button
            className={styles.submitButton}
            disabled={isLoading || !username.trim() || !password}
            type="submit"
          >
            {isLoading
              ? "Зачекайте..."
              : isRegisterMode
                ? "Зареєструватися"
                : "Увійти"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}
