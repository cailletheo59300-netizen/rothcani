import { ChevronDown } from "lucide-react";
import { Field } from "./ui";
import type { Lot, Supplier } from "@/lib/types";

/** Champs d'un lot : l'essentiel d'abord, les réglages fins repliés. */
export function LotFields({ lot, suppliers, withCount }: { lot?: Lot; suppliers: Supplier[]; withCount?: boolean }) {
  return (
    <div className="space-y-4">
      <Field label="Nom du lot">
        <input name="name" required defaultValue={lot?.name ?? ""} className="input" placeholder="Ex. Balle vintage 25 kg, mars" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix payé (€)">
          <input name="price" required inputMode="decimal" defaultValue={lot?.price ?? ""} className="input" />
        </Field>
        <Field label="Frais de livraison (€)">
          <input name="shipping_cost" inputMode="decimal" defaultValue={lot?.shipping_cost ?? ""} className="input" placeholder="0" />
        </Field>
      </div>
      {withCount && (
        <Field label="Nombre d'articles dans le lot">
          <input name="count" type="number" min={0} max={500} className="input" placeholder="Optionnel : crée les fiches à compléter" />
        </Field>
      )}
      <details className="group rounded-xl border border-border" open={!withCount}>
        <summary className="flex items-center justify-between px-3 py-2.5 text-sm text-muted">
          Fournisseur, date et répartition du coût
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fournisseur">
              <select name="supplier_id" defaultValue={lot?.supplier_id ?? ""} className="input">
                <option value="">Aucun</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Date d'achat">
              <input name="purchased_on" type="date" defaultValue={lot?.purchased_on ?? new Date().toISOString().slice(0, 10)} className="input" />
            </Field>
          </div>
          <Field label="Répartition du coût sur les articles">
            <select name="cost_mode" defaultValue={lot?.cost_mode ?? "egal"} className="input">
              <option value="egal">Parts égales</option>
              <option value="prorata">Selon le prix de vente de chaque article</option>
              <option value="manuel">À la main, article par article</option>
            </select>
          </Field>
          <Field label="Notes">
            <input name="notes" defaultValue={lot?.notes ?? ""} className="input" />
          </Field>
        </div>
      </details>
    </div>
  );
}
