import "./globals.css";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { getDb } from "@/lib/db";
import { getSetting } from "@tracker/db";
import { DEFAULT_SETTINGS } from "@tracker/shared";

export function generateMetadata(): Metadata {
  const db = getDb();
  const name = getSetting<string>(db, "dashboard.brandName") ?? DEFAULT_SETTINGS.dashboard.brandName;
  return { title: name };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Suspense fallback={<div className="h-12 border-b border-border" />}>
              <Header />
            </Suspense>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
