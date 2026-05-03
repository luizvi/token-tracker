import Link from "next/link";
import { Home, ListTodo, Users, FolderKanban, Calendar, Settings, Activity } from "lucide-react";

const items = [
  { href: "/", icon: Home, label: "Overview" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/projects", icon: FolderKanban, label: "Projetos" },
  { href: "/events", icon: Calendar, label: "Eventos" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/diagnostics", icon: Activity, label: "Diagnostics" },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-bg-secondary border-r border-border min-h-screen">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-accent">LV Tracker</h1>
        <p className="text-xs text-text-muted">Fase 1</p>
      </div>
      <nav className="p-2">
        {items.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2 rounded text-text-secondary hover:bg-bg-card-hover hover:text-text-primary text-sm">
            <Icon size={16} /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
