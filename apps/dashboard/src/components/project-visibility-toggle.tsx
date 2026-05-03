"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProjectVisibilityToggle({
  projectId,
  active,
}: {
  projectId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={active ? "Marcar como app/plugin (some das listas padrão)" : "Mostrar de novo nas listas padrão"}
      className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
        active
          ? "border-border text-text-muted hover:text-text-primary"
          : "border-warning/30 text-warning bg-warning/10"
      }`}
    >
      {busy ? "..." : active ? "marcar como app/plugin" : "✓ marcado como app/plugin"}
    </button>
  );
}
