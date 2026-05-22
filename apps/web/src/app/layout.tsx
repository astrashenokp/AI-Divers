import type { Metadata } from "next";
import { AppHeader } from "@/components/site/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Divers",
  description: "Студія для створення, тестування та запуску AI-агентів",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
