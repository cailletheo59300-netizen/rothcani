import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
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
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Réglages" />

      {adminRes.data && (
        <Link href="/admin" className="card mb-8 flex items-center justify-between px-5 py-4 text-sm transition-colors hover:bg-surface-2">
          Administration
          <ChevronRight size={16} className="text-muted" />
        </Link>
      )}

      <Block title="Ventes" text="Ces frais sont pré-remplis à chaque vente pour calculer votre marge réelle.">
        <form action={saveProfile} className="card space-y-4 p-5">
          <Field label="Votre prénom">
            <input name="display_name" defaultValue={profile.display_name ?? ""} className="input" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Emballage (€)">
              <input name="default_packaging_fee" inputMode="decimal" defaultValue={profile.default_packaging_fee} className="input" />
            </Field>
            <Field label="Envoi (€)">
              <input name="default_shipping_fee" inputMode="decimal" defaultValue={profile.default_shipping_fee} className="input" />
            </Field>
            <Field label="Plateforme (€)">
              <input name="default_platform_fee" inputMode="decimal" defaultValue={profile.default_platform_fee} className="input" />
            </Field>
          </div>
          <Field label="Un article « dort » après combien de jours en ligne ?">
            <input name="dormant_days" type="number" min={1} defaultValue={profile.dormant_days} className="input max-w-32" />
          </Field>
          <div className="flex justify-end">
            <Submit>Enregistrer</Submit>
          </div>
        </form>
      </Block>

      <Block title="Emplacements" text="Là où vous rangez vos articles : bac, étagère, carton.">
        <List table="locations" rows={refs.locations.map((l) => ({ id: l.id, name: l.name }))} placeholder="Ex. Bac 3" />
      </Block>

      <Block title="Comptes de vente" text="Pour savoir sur quel compte chaque article est publié.">
        <List table="sales_accounts" rows={refs.accounts.map((a) => ({ id: a.id, name: a.name }))} placeholder="Ex. Compte vintage" />
      </Block>

      <Block title="Fournisseurs" text="Pour comparer la rentabilité de vos sources d'achat.">
        <List table="suppliers" rows={refs.suppliers.map((s) => ({ id: s.id, name: s.name }))} placeholder="Nom du fournisseur" />
      </Block>

      <Block id="import" title="Vos données" text="Importez votre stock depuis Excel, ou récupérez toutes vos données.">
        <div className="card space-y-5 p-5">
          <ImportCsv />
          <div className="border-t border-border pt-5">
            <p className="label">Exporter (fichier Excel / CSV)</p>
            <div className="flex flex-wrap gap-2">
              <a className="btn-ghost h-9" href="/export?type=items">Articles</a>
              <a className="btn-ghost h-9" href="/export?type=sales">Ventes</a>
              <a className="btn-ghost h-9" href="/export?type=lots">Lots</a>
            </div>
          </div>
        </div>
      </Block>
    </div>
  );
}

function Block({ id, title, text, children }: { id?: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-3 mt-0.5 text-sm text-muted">{text}</p>
      {children}
    </section>
  );
}

function List({ table, rows, placeholder }: { table: "locations" | "suppliers" | "sales_accounts"; rows: { id: string; name: string }[]; placeholder: string }) {
  return (
    <div className="card overflow-hidden">
      {rows.length > 0 && (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 px-5 py-2.5 text-[15px]">
              <span className="flex-1 truncate">{r.name}</span>
              <form action={deleteListEntry.bind(null, table, r.id)}>
                <Submit className="btn-quiet h-8 w-8 px-0" confirmText={`Supprimer « ${r.name} » ?`}>
                  <X size={15} />
                </Submit>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addListEntry.bind(null, table)} className={`flex gap-2 p-3 ${rows.length ? "border-t border-border" : ""}`}>
        <input name="name" required placeholder={placeholder} className="input" />
        <Submit className="btn-ghost">Ajouter</Submit>
      </form>
    </div>
  );
}
