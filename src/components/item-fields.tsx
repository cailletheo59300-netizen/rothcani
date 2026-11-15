import { ChevronDown } from "lucide-react";
import { Field } from "./ui";
import { STATUS_META } from "@/lib/format";
import { STATUSES, type Item, type Lot, type Named, type SalesAccount } from "@/lib/types";

export const CONDITIONS = ["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="section-title mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Champs d'un article.
 * - "full" (fiche) : tout, regroupé en Annonce / Prix / Rangement.
 * - "quick" (ajout rapide) : l'essentiel visible, le reste replié.
 */
export function ItemFields({
  item,
  lots,
  locations,
  accounts,
  mode = "full",
}: {
  item?: Partial<Item>;
  lots: Lot[];
  locations: Named[];
  accounts: SalesAccount[];
  mode?: "full" | "quick";
}) {
  const brandSize = (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Marque">
        <input name="brand" defaultValue={item?.brand ?? ""} className="input" />
      </Field>
      <Field label="Taille">
        <input name="size" defaultValue={item?.size ?? ""} className="input" placeholder="M, 38, 10 ans" />
      </Field>
    </div>
  );
  const condition = (
    <Field label="État">
      <select name="condition" defaultValue={item?.condition ?? ""} className="input">
        <option value="">Non précisé</option>
        {CONDITIONS.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </Field>
  );
  const catColor = (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Catégorie">
        <input name="category" defaultValue={item?.category ?? ""} className="input" placeholder="Pull, jean, baskets" />
      </Field>
      <Field label="Couleur">
        <input name="color" defaultValue={item?.color ?? ""} className="input" />
      </Field>
    </div>
  );
  const description = (
    <Field label="Description">
      <textarea name="description" rows={4} defaultValue={item?.description ?? ""} className="input" placeholder="Le texte de l'annonce Vinted" />
    </Field>
  );
  const status = (
    <Field label="Statut">
      <select name="status" defaultValue={item?.status ?? "arrivage"} className="input">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_META[s].label}</option>
        ))}
      </select>
    </Field>
  );
  const location = (
    <Field label="Emplacement">
      <select name="location_id" defaultValue={item?.location_id ?? ""} className="input">
        <option value="">Aucun</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </Field>
  );
  const lot = (
    <Field label="Lot">
      <select name="lot_id" defaultValue={item?.lot_id ?? ""} className="input">
        <option value="">Acheté seul</option>
        {lots.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </Field>
  );
  const account =
    accounts.length > 1 ? (
      <Field label="Compte de vente">
        <select name="sales_account_id" defaultValue={item?.sales_account_id ?? accounts[0]?.id ?? ""} className="input">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
    ) : (
      <input type="hidden" name="sales_account_id" value={item?.sales_account_id ?? accounts[0]?.id ?? ""} />
    );
  const price = (
    <Field label="Prix de vente (€)">
      <input name="listed_price" inputMode="decimal" defaultValue={item?.listed_price ?? ""} className="input" />
    </Field>
  );
  const cost = (
    <Field label="Prix d'achat (€)">
      <input name="manual_cost" inputMode="decimal" defaultValue={item?.manual_cost ?? ""} className="input" placeholder={item?.lot_id || mode === "quick" ? "Calculé depuis le lot" : ""} />
    </Field>
  );
  const floor = (
    <Field label="Prix minimum accepté (€)">
      <input name="floor_price" inputMode="decimal" defaultValue={item?.floor_price ?? ""} className="input" />
    </Field>
  );
  const notes = (
    <Field label="Notes pour vous">
      <textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} className="input" placeholder="Défaut, mesures, détails" />
    </Field>
  );
  const title = (
    <Field label="Titre">
      <input name="title" required defaultValue={item?.title ?? ""} className="input" placeholder="Ex. Pull Ralph Lauren bleu marine" />
    </Field>
  );

  if (mode === "quick") {
    return (
      <div className="space-y-3">
        {title}
        {brandSize}
        <div className="grid grid-cols-2 gap-3">
          {price}
          {condition}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {lot}
          {location}
        </div>
        <details className="group rounded-xl border border-border">
          <summary className="flex items-center justify-between px-3 py-2.5 text-sm text-muted">
            Plus de détails
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-border p-3">
            {status}
            {catColor}
            <div className="grid grid-cols-2 gap-3">
              {cost}
              {floor}
            </div>
            {account}
            {description}
            {notes}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Group title="Annonce">
        {title}
        {brandSize}
        {catColor}
        {condition}
        {description}
      </Group>
      <Group title="Prix">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {price}
          {floor}
          {cost}
        </div>
      </Group>
      <Group title="Rangement et suivi">
        <div className="grid grid-cols-2 gap-3">
          {status}
          {location}
          {lot}
          {account}
        </div>
        {notes}
      </Group>
    </div>
  );
}
