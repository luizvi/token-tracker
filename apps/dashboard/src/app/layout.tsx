import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const metadata = { title: "LV Dev Tracker" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
