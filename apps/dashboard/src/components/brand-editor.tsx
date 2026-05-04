"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEYS = {
  name: "dashboard.brandName",
  tagline: "dashboard.brandTagline",
  accent: "dashboard.brandAccent",
} as const;

type Brand = { name: string; tagline: string; accent: string };

const DEFAULT_BRAND: Brand = {
  name: "token-tracker",
  tagline: "Local-first analytics",
  accent: "#22c55e",
};

export function BrandEditor() {
  const router = useRouter();
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { settings: Record<string, unknown> }) => {
        const s = d.settings;
        setBrand({
          name: (s[KEYS.name] as string) ?? DEFAULT_BRAND.name,
          tagline: (s[KEYS.tagline] as string) ?? DEFAULT_BRAND.tagline,
          accent: (s[KEYS.accent] as string) ?? DEFAULT_BRAND.accent,
        });
        setLoading(false);
      });
  }, []);

  async function save(key: string, value: unknown) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Falha ao salvar ${key}: ${t}`);
      return;
    }
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1500);
    // Invalida cache do RSC pra que o layout (sidebar/title/CSS vars) re-renderize
    // sem precisar de F5. Layout está marcado como force-dynamic.
    router.refresh();
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">Identidade do Dashboard</h3>
        <span className="text-[11px] text-text-muted">aplica em todo o sistema</span>
      </div>
      <p className="text-[11px] text-text-muted">
        Personalize nome, tagline e <strong>cor de destaque</strong>. A cor afeta sidebar, links, botões, gráficos e clientes que não têm cor própria. Mudanças aplicam imediatamente — sem reload.
      </p>

      <label className="flex items-center gap-3">
        <span className="text-sm text-text-secondary w-32">Nome</span>
        <input
          type="text"
          maxLength={40}
          value={brand.name}
          onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
          onBlur={(e) => save(KEYS.name, e.target.value)}
          className="bg-bg-card border border-border rounded px-2 py-1 flex-1 max-w-xs"
        />
        {savedKey === KEYS.name && <span className="text-[11px] text-accent">✓ salvo</span>}
      </label>

      <label className="flex items-center gap-3">
        <span className="text-sm text-text-secondary w-32">Tagline</span>
        <input
          type="text"
          maxLength={80}
          value={brand.tagline}
          onChange={(e) => setBrand((b) => ({ ...b, tagline: e.target.value }))}
          onBlur={(e) => save(KEYS.tagline, e.target.value)}
          className="bg-bg-card border border-border rounded px-2 py-1 flex-1 max-w-xs"
          placeholder="(vazio esconde)"
        />
        {savedKey === KEYS.tagline && <span className="text-[11px] text-accent">✓ salvo</span>}
      </label>

      <label className="flex items-center gap-3">
        <span className="text-sm text-text-secondary w-32">Cor de destaque</span>
        <input
          type="color"
          value={brand.accent}
          onChange={(e) => {
            const next = e.target.value;
            setBrand((b) => ({ ...b, accent: next }));
            save(KEYS.accent, next);
          }}
          className="bg-bg-card border border-border rounded h-8 w-12 cursor-pointer"
        />
        <input
          type="text"
          value={brand.accent}
          onChange={(e) => setBrand((b) => ({ ...b, accent: e.target.value }))}
          onBlur={(e) => save(KEYS.accent, e.target.value)}
          className="bg-bg-card border border-border rounded px-2 py-1 w-28 font-mono"
          pattern="^#[0-9a-fA-F]{6}$"
          placeholder="#22c55e"
        />
        {savedKey === KEYS.accent && <span className="text-[11px] text-accent">✓ salvo</span>}
      </label>

      <div className="border border-border rounded p-3 bg-bg-tertiary">
        <p className="text-[11px] text-text-muted mb-2">Preview:</p>
        <h4 className="text-lg font-bold" style={{ color: brand.accent }}>
          {brand.name || "(sem nome)"}
        </h4>
        {brand.tagline && <p className="text-xs text-text-muted">{brand.tagline}</p>}
      </div>
    </section>
  );
}
