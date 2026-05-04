import { getDb } from "@/lib/db";
import { getSetting } from "@tracker/db";
import { DEFAULT_SETTINGS } from "@tracker/shared";
import { SidebarShell, type SidebarBrand } from "./sidebar-shell";

function loadBrand(): SidebarBrand {
  const db = getDb();
  const name = getSetting<string>(db, "dashboard.brandName");
  const tagline = getSetting<string>(db, "dashboard.brandTagline");
  const accent = getSetting<string>(db, "dashboard.brandAccent");
  return {
    name: name ?? DEFAULT_SETTINGS.dashboard.brandName,
    tagline: tagline ?? DEFAULT_SETTINGS.dashboard.brandTagline,
    accent: accent ?? DEFAULT_SETTINGS.dashboard.brandAccent,
  };
}

export function Sidebar() {
  const brand = loadBrand();
  return <SidebarShell brand={brand} />;
}
