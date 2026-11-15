import Link from "next/link";
import { Check } from "lucide-react";
import { hideChecklist } from "@/app/bienvenue/actions";
import { Submit } from "./submit";

export type Progress = { has_location: boolean; has_lot: boolean; has_item_photo: boolean; has_online: boolean; has_sale: boolean };

const ITEMS: { key: keyof Progress; label: string; hint: string; href: string }[] = [
  { key: "has_lot", label: "Créer votre premier lot", hint: "Le coût de l'arrivage est réparti sur ses articles", href: "/lots/nouveau" },
  { key: "has_item_photo", label: "Ajouter un article avec photo", hint: "Depuis votre téléphone, en quelques secondes", href: "/ajout" },
  { key: "has_location", label: "Créer un emplacement de rangement", hint: "Pour retrouver un article vendu en 5 secondes", href: "/reglages" },
  { key: "has_online", label: "Passer un article « En ligne »", hint: "Quand l'annonce est publiée sur Vinted", href: "/stock" },
  { key: "has_sale", label: "Enregistrer votre première vente", hint: "Et voir votre marge réelle", href: "/stock?status=en_ligne" },
];

export function Checklist({ progress }: { progress: Progress }) {
  const done = ITEMS.filter((i) => progress[i.key]).length;
  if (done === ITEMS.length) return null;
  return (
    <section className="card mb-6 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Premiers pas</h2>
          <p className="text-xs text-muted">
            {done} sur {ITEMS.length} terminés
          </p>
        </div>
        <form action={hideChecklist}>
          <Submit className="text-xs text-muted hover:text-text">Masquer</Submit>
        </form>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / ITEMS.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1 md:grid-cols-2">
        {ITEMS.map((i) => {
          const ok = progress[i.key];
          return (
            <li key={i.key}>
              <Link href={i.href} className={`flex items-start gap-3 rounded-xl p-2 ${ok ? "opacity-60" : "hover:bg-surface-2"}`}>
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    ok ? "border-good bg-good text-white" : "border-border"
                  }`}
                >
                  {ok && <Check size={12} strokeWidth={3} />}
                </span>
                <span>
                  <span className={`block text-sm ${ok ? "line-through" : "font-medium"}`}>{i.label}</span>
                  {!ok && <span className="block text-xs text-muted">{i.hint}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
