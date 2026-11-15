"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { StatusBadge, Thumb } from "@/components/ui";
import { STATUS_META, euro, ref } from "@/lib/format";
import { STATUSES, type ItemStatus, type Named, type SalesAccount } from "@/lib/types";
import { bulkUpdate, deleteItems } from "../actions";

export type StockRow = {
  id: string;
  ref_number: number;
  title: string;
  subtitle: string;
  status: ItemStatus;
  listed_price: number | null;
  thumb: string | null;
  location: string | null;
};

export function StockList({ rows, locations, accounts }: { rows: StockRow[]; locations: Named[]; accounts: SalesAccount[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const all = selected.size === rows.length;
  const ids = [...selected];
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      setSelected(new Set());
    });

  return (
    <>
      <div className="mb-2 flex items-center gap-3 px-4 text-[13px] text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={all}
          onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
          aria-label="Tout sélectionner"
        />
        <span>Tout sélectionner</span>
      </div>

      <ul className="card divide-y divide-border overflow-hidden">
        {rows.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${selected.has(r.id) ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-[var(--accent)]"
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
              aria-label={`Sélectionner ${r.title}`}
            />
            <Link href={`/stock/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Thumb url={r.thumb} alt={r.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{r.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-muted">
                  {ref(r.ref_number)}
                  {r.subtitle && ` · ${r.subtitle}`}
                  {r.location && ` · ${r.location}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-medium">{r.listed_price != null ? euro(r.listed_price) : "—"}</p>
                <div className="mt-0.5">
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-24 z-30 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2 pl-4 shadow-2xl">
            <span className="mr-1 text-sm font-medium">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
            <select
              className="input h-9 w-auto"
              disabled={pending}
              value=""
              onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { status: e.target.value }))}
            >
              <option value="">Statut</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            {locations.length > 0 && (
              <select
                className="input h-9 w-auto"
                disabled={pending}
                value=""
                onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { location_id: e.target.value === "none" ? null : e.target.value }))}
              >
                <option value="">Ranger</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
                <option value="none">Aucun emplacement</option>
              </select>
            )}
            {accounts.length > 1 && (
              <select
                className="input h-9 w-auto"
                disabled={pending}
                value=""
                onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { sales_account_id: e.target.value }))}
              >
                <option value="">Compte</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Link className="btn-ghost h-9" href={`/etiquettes?ids=${ids.join(",")}`}>
              Étiquettes
            </Link>
            <button
              className="btn-quiet h-9 text-bad"
              disabled={pending}
              onClick={() => confirm(`Supprimer ${selected.size} article(s) ? Cette action est définitive.`) && run(() => deleteItems(ids))}
            >
              Supprimer
            </button>
            <button className="btn-quiet h-9" onClick={() => setSelected(new Set())} aria-label="Annuler la sélection">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
