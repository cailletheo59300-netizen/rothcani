import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, loadRefs } from "@/lib/data";
import { Field, PageHeader } from "@/components/ui";
import { Submit } from "@/components/submit";
import { addListEntry, deleteListEntry, saveProfile } from "../actions";
import { ImportCsv } from "./import-csv";

export default async function ReglagesPage() {
  const { supabase, user } = await requireUser();
  const [profile, refs, adminRes] = await Promise.all([loadProfile(supabase, user.id), loadRefs(supabase), supabase.rpc("admin_role")]);

  return (
    <>
      <PageHeader
        title="Réglages"
        action={
          adminRes.data ? (
            <Link href="/admin" className="btn-ghost">
              Administration
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={saveProfile} className="card space-y-4 p-4 lg:col-span-2">
          <h2 className="text-sm font-medium">Frais par défaut à chaque vente</h2>
          <p className="-mt-2 text-xs text-muted">Pré-remplis quand vous enregistrez une vente ; modifiables à chaque fois.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field label="Votre nom">
              <input name="display_name" defaultValue={profile.display_name ?? ""} className="input" />
            </Field>
            <Field label="Emballage (€)">
              <input name="default_packaging_fee" inputMode="decimal" defaultValue={profile.default_packaging_fee} className="input" />
            </Field>
            <Field label="Envoi à votre charge (€)">
              <input name="default_shipping_fee" inputMode="decimal" defaultValue={profile.default_shipping_fee} className="input" />
            </Field>
            <Field label="Frais plateforme (€)">
              <input name="default_platform_fee" inputMode="decimal" defaultValue={profile.default_platform_fee} className="input" />
            </Field>
            <Field label="Article « dormant » après (jours)">
              <input name="dormant_days" type="number" min={1} defaultValue={profile.dormant_days} className="input" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Submit>Enregistrer</Submit>
          </div>
        </form>

        <ListCard
          title="Comptes de vente"
          hint="Vos comptes Vinted (ou autres) : une simple étiquette pour savoir où est publié chaque article."
          table="sales_accounts"
          rows={refs.accounts.map((a) => ({ id: a.id, name: a.name, extra: a.platform }))}
          placeholder="Ex. Compte vintage"
          extraField={{ name: "platform", placeholder: "Vinted", label: "Plateforme" }}
        />
        <ListCard
          title="Emplacements"
          hint="Où vous rangez physiquement vos articles : bac, étagère, carton…"
          table="locations"
          rows={refs.locations.map((l) => ({ id: l.id, name: l.name }))}
          placeholder="Ex. Bac 3, Étagère A2"
        />
        <ListCard
          title="Fournisseurs"
          hint="Grossistes, friperies, particuliers… pour mesurer qui est rentable."
          table="suppliers"
          rows={refs.suppliers.map((s) => ({ id: s.id, name: s.name, extra: s.kind ?? undefined }))}
          placeholder="Nom du fournisseur"
          extraField={{ name: "kind", placeholder: "Grossiste, friperie…", label: "Type" }}
        />

        <section id="import" className="card space-y-3 p-4">
          <h2 className="text-sm font-medium">Importer / exporter</h2>
          <ImportCsv />
          <div className="border-t border-border pt-3">
            <p className="label">Exporter vos données (CSV, ouvrable dans Excel)</p>
            <div className="flex flex-wrap gap-2">
              <a className="btn-ghost h-9" href="/export?type=items">Articles</a>
              <a className="btn-ghost h-9" href="/export?type=sales">Ventes</a>
              <a className="btn-ghost h-9" href="/export?type=lots">Lots</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ListCard({
  title,
  hint,
  table,
  rows,
  placeholder,
  extraField,
}: {
  title: string;
  hint: string;
  table: "locations" | "suppliers" | "sales_accounts";
  rows: { id: string; name: string; extra?: string }[];
  placeholder: string;
  extraField?: { name: string; placeholder: string; label: string };
}) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      {rows.length > 0 && (
        <ul className="mb-3 divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1 truncate">{r.name}</span>
              {r.extra && <span className="text-xs text-muted">{r.extra}</span>}
              <form action={deleteListEntry.bind(null, table, r.id)}>
                <Submit className="rounded-lg p-1 text-muted hover:text-bad" confirmText={`Supprimer « ${r.name} » ?`}>
                  <Trash2 size={14} />
                </Submit>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addListEntry.bind(null, table)} className="flex gap-2">
        <input name="name" required placeholder={placeholder} className="input" aria-label={title} />
        {extraField && <input name={extraField.name} placeholder={extraField.placeholder} className="input w-36" aria-label={extraField.label} />}
        <Submit className="btn-ghost">Ajouter</Submit>
      </form>
    </section>
  );
}
