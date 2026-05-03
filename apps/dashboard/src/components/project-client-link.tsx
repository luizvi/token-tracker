"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  color: string | null;
}

export function ProjectClientLink({
  projectId,
  currentClientId,
}: {
  projectId: string;
  currentClientId: string | null;
}) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string>(currentClientId ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []));
  }, []);

  async function save(value: string) {
    setSaving(true);
    setSelected(value);
    const payload = { clientId: value || null };
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSavedAt(Date.now());
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted">Cliente:</label>
      <select
        value={selected}
        onChange={(e) => save(e.target.value)}
        disabled={saving}
        className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
      >
        <option value="">— sem cliente —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-text-muted">salvando...</span>}
      {savedAt && Date.now() - savedAt < 2000 && <span className="text-xs text-accent">✓ salvo</span>}
    </div>
  );
}
