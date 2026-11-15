"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Sparkles } from "lucide-react";
import { applySuggestion, generateForItem } from "@/app/(app)/ai-actions";
import type { ListingSuggestion } from "@/lib/ai";
import { euro } from "@/lib/format";

export function AiListing({ itemId, hasPhotos, description }: { itemId: string; hasPhotos: boolean; description: string | null }) {
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
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={16} className="text-accent" /> Annonce par l&apos;IA
        </h2>
        <button className="btn-primary h-9" onClick={generate} disabled={pending || !hasPhotos}>
          {pending && !s ? "Rédaction…" : s ? "Régénérer" : "Rédiger l'annonce"}
        </button>
      </div>
      {!hasPhotos && <p className="text-xs text-muted">Ajoutez des photos : l&apos;IA s&apos;en sert pour rédiger titre, description et prix.</p>}
      {error && <p className="text-sm text-bad">{error}</p>}

      {!s && description && (
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="label mb-0">Description enregistrée</p>
            <button className="text-xs text-accent" onClick={() => copy(description)}>
              {copied ? "Copié ✔" : "Copier"}
            </button>
          </div>
          <p className="whitespace-pre-line text-sm">{description}</p>
        </div>
      )}

      {s && (
        <div className="space-y-3">
          <div className="rounded-xl bg-surface-2 p-3">
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
          {s.notes && <p className="rounded-xl border border-border p-2 text-xs text-muted">⚠️ À vérifier : {s.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={apply} disabled={pending}>
              Appliquer à la fiche
            </button>
            <button className="btn-ghost" onClick={() => copy(`${s.title}\n\n${s.description}`)}>
              <Copy size={14} /> {copied ? "Copié ✔" : "Copier pour Vinted"}
            </button>
          </div>
          <p className="text-[11px] text-muted">Relisez avant de publier : l&apos;IA peut se tromper sur une marque ou une matière.</p>
        </div>
      )}
    </section>
  );
}
