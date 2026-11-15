import { Field } from "./ui";
import { STATUS_META } from "@/lib/format";
import { STATUSES, type Item, type Lot, type Named, type SalesAccount } from "@/lib/types";

export const CONDITIONS = ["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"];

/** Champs d'un article, partagés entre la fiche et l'ajout rapide. */
export function ItemFields({
  item,
  lots,
  locations,
  accounts,
  showStatus = true,
}: {
  item?: Partial<Item>;
  lots: Lot[];
  locations: Named[];
  accounts: SalesAccount[];
  showStatus?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label="Titre" className="col-span-2 md:col-span-4">
        <input name="title" required defaultValue={item?.title ?? ""} className="input" placeholder="Ex. Pull Ralph Lauren col rond bleu marine" />
      </Field>
      <Field label="Marque">
        <input name="brand" defaultValue={item?.brand ?? ""} className="input" />
      </Field>
      <Field label="Taille">
        <input name="size" defaultValue={item?.size ?? ""} className="input" placeholder="M, 38, 10 ans…" />
      </Field>
      <Field label="Catégorie">
        <input name="category" defaultValue={item?.category ?? ""} className="input" placeholder="Pull, jean, baskets…" />
      </Field>
      <Field label="Couleur">
        <input name="color" defaultValue={item?.color ?? ""} className="input" />
      </Field>
      <Field label="État" className="col-span-2">
        <select name="condition" defaultValue={item?.condition ?? ""} className="input">
          <option value="">—</option>
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {showStatus && (
        <Field label="Statut" className="col-span-2">
          <select name="status" defaultValue={item?.status ?? "arrivage"} className="input">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Prix affiché (€)">
        <input name="listed_price" inputMode="decimal" defaultValue={item?.listed_price ?? ""} className="input" />
      </Field>
      <Field label="Prix plancher (€)">
        <input name="floor_price" inputMode="decimal" defaultValue={item?.floor_price ?? ""} className="input" placeholder="Prix minimum accepté" />
      </Field>
      <Field label="Lot" className="col-span-2">
        <select name="lot_id" defaultValue={item?.lot_id ?? ""} className="input">
          <option value="">Acheté seul (hors lot)</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Coût d'achat (€)" className="col-span-2 md:col-span-1">
        <input
          name="manual_cost"
          inputMode="decimal"
          defaultValue={item?.manual_cost ?? ""}
          className="input"
          placeholder="Auto si lot"
        />
      </Field>
      <Field label="Emplacement">
        <select name="location_id" defaultValue={item?.location_id ?? ""} className="input">
          <option value="">—</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Compte de vente" className="col-span-2">
        <select name="sales_account_id" defaultValue={item?.sales_account_id ?? accounts[0]?.id ?? ""} className="input">
          <option value="">—</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes" className="col-span-2 md:col-span-4">
        <textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} className="input" placeholder="Défaut, mesures, détails…" />
      </Field>
    </div>
  );
}
