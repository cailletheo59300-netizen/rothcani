import { Field } from "./ui";
import type { Lot, Supplier } from "@/lib/types";

export function LotFields({ lot, suppliers, withCount }: { lot?: Lot; suppliers: Supplier[]; withCount?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label="Nom du lot" className="col-span-2">
        <input name="name" required defaultValue={lot?.name ?? ""} className="input" placeholder="Ex. Balle vintage 25 kg — mars" />
      </Field>
      <Field label="Fournisseur" className="col-span-2">
        <select name="supplier_id" defaultValue={lot?.supplier_id ?? ""} className="input">
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Prix payé (€)">
        <input name="price" required inputMode="decimal" defaultValue={lot?.price ?? ""} className="input" />
      </Field>
      <Field label="Frais de livraison (€)">
        <input name="shipping_cost" inputMode="decimal" defaultValue={lot?.shipping_cost ?? 0} className="input" />
      </Field>
      <Field label="Date d'achat">
        <input name="purchased_on" type="date" defaultValue={lot?.purchased_on ?? new Date().toISOString().slice(0, 10)} className="input" />
      </Field>
      <Field label="Répartition du coût">
        <select name="cost_mode" defaultValue={lot?.cost_mode ?? "egal"} className="input">
          <option value="egal">Parts égales</option>
          <option value="prorata">Au prorata du prix affiché</option>
          <option value="manuel">Manuelle (article par article)</option>
        </select>
      </Field>
      {withCount && (
        <Field label="Créer tout de suite N articles vides (optionnel)" className="col-span-2">
          <input name="count" type="number" min={0} max={500} className="input" placeholder="Ex. 20 — à compléter ensuite" />
        </Field>
      )}
      <Field label="Notes" className={withCount ? "col-span-2" : "col-span-2 md:col-span-4"}>
        <input name="notes" defaultValue={lot?.notes ?? ""} className="input" />
      </Field>
    </div>
  );
}
