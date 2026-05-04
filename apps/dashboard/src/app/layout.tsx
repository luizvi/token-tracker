import "./globals.css";
import { Suspense, type ReactNode, type CSSProperties } from "react";
import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { getDb } from "@/lib/db";
import { getSetting } from "@tracker/db";
import { DEFAULT_SETTINGS } from "@tracker/shared";

// Layout sempre dinâmico — caso contrário Next cacheia o RSC e mudanças de brand
// (nome, accent) só aparecem após hard reload.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const db = getDb();
  const name = getSetting<string>(db, "dashboard.brandName") ?? DEFAULT_SETTINGS.dashboard.brandName;
  return { title: name };
}

/** Decide entre fg preto ou branco baseado em luminância relativa (WCAG-style). */
function pickAccentForeground(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#0a3d20";
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Luminância simples (0..255). > 150 = cor clara → fg escuro; senão → fg claro.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? "#0a1f10" : "#ffffff";
}

/** Escurece a cor em ~10% pra derivar hover. */
function deriveAccentHover(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const adjust = (c: number) => Math.max(0, Math.round(c * 0.88));
  const r = adjust((n >> 16) & 0xff);
  const g = adjust((n >> 8) & 0xff);
  const b = adjust(n & 0xff);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const db = getDb();
  const accent = getSetting<string>(db, "dashboard.brandAccent") ?? DEFAULT_SETTINGS.dashboard.brandAccent;
  const accentFg = pickAccentForeground(accent);
  const accentHover = deriveAccentHover(accent);

  const themeStyle: CSSProperties = {
    "--color-accent": accent,
    "--color-accent-fg": accentFg,
    "--color-accent-hover": accentHover,
  } as CSSProperties;

  return (
    <html lang="pt-BR" style={themeStyle}>
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
