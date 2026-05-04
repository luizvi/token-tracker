"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  ListTodo,
  Users,
  FolderKanban,
  Calendar,
  Settings,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const items = [
  { href: "/", icon: Home, label: "Overview" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/projects", icon: FolderKanban, label: "Projetos" },
  { href: "/events", icon: Calendar, label: "Eventos" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/diagnostics", icon: Activity, label: "Diagnostics" },
];

const STORAGE_KEY = "tktr.sidebar.collapsed";

export type SidebarBrand = {
  name: string;
  tagline: string;
  accent: string;
};

export function SidebarShell({ brand }: { brand: SidebarBrand }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const widthClass = collapsed ? "w-14" : "w-60";

  return (
    <aside
      className={`${widthClass} bg-bg-secondary border-r border-border min-h-screen transition-[width] duration-200 ease-in-out flex flex-col`}
      aria-expanded={!collapsed}
    >
      <div className="p-4 border-b border-border flex items-center gap-2 min-h-[68px]">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1
              className="text-lg font-bold truncate text-accent"
              title={brand.name}
            >
              {brand.name}
            </h1>
            {brand.tagline && (
              <p className="text-xs text-text-muted truncate">{brand.tagline}</p>
            )}
          </div>
        )}
        {hydrated && (
          <button
            type="button"
            onClick={toggle}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
            title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>
      <nav className="p-2 flex flex-col gap-0.5">
        {items.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded text-text-secondary hover:bg-bg-card-hover hover:text-text-primary text-sm ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
