"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Sparkles } from "lucide-react";
import { applySuggestion, generateForItem } from "@/app/(app)/ai-actions";
import type { ListingSuggestion } from "@/lib/ai";
import { euro } from "@/lib/format";

export function AiListing({ itemId, hasPhotos }: { itemId: string; hasPhotos: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<ListingSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const generate = () =>
    start(async () => {
      setError(null);
      const res = await generateForItem(itemId);
      if (res.ok) setS(res.suggestion);
      else setError(res.error);
    });

  const apply = () =>
    start(async () => {
      if (!s) return;
      await applySuggestion(itemId, s, ["title", "description", "details", "price"]);
      setS(null);
      router.refresh();
    });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-accent/25 bg-accent-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Sparkles size={18} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Rédiger l&apos;annonce avec l&apos;IA</p>
            <p className="text-[13px] text-muted">{hasPhotos ? "Titre, description et prix à partir de vos photos." : "Ajoutez d'abord une photo."}</p>
          </div>
        </div>
        <button className="btn-primary h-9 shrink-0" onClick={generate} disabled={pending || !hasPhotos}>
          {pending && !s ? "Rédaction…" : s ? "Recommencer" : "Rédiger"}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}

      {s && (
        <div className="space-y-3">
          <div className="rounded-xl bg-surface p-3">
            <p className="label">Titre</p>
            <p className="text-sm font-medium">{s.title}</p>
            <p className="label mt-3">Description</p>
            <p className="whitespace-pre-line text-sm">{s.description}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Marque", s.brand],
              ["Taille", s.size],
              ["Catégorie", s.category],
              ["État", s.condition],
              ["Couleur", s.color],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd>{v ?? "—"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-muted">Prix conseillé</dt>
              <dd className="font-medium">
                {euro(s.price_suggested)} <span className="text-muted">({euro(s.price_low)} – {euro(s.price_high)})</span>
              </dd>
            </div>
          </dl>
          {s.notes && <p className="text-[13px] text-muted">À vérifier : {s.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={apply} disabled={pending}>
              Utiliser cette annonce
            </button>
            <button className="btn-ghost" onClick={() => copy(`${s.title}\n\n${s.description}`)}>
              <Copy size={14} /> {copied ? "Copié" : "Copier pour Vinted"}
            </button>
          </div>
          <p className="text-[11px] text-muted">Relisez avant de publier : l&apos;IA peut se tromper sur une marque ou une matière.</p>
        </div>
      )}
    </section>
  );
}
