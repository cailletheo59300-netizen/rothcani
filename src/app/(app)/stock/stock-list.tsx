"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { StatusBadge, Thumb } from "@/components/ui";
import { IN_STOCK, STATUS_META, euro, ref } from "@/lib/format";
import { STATUSES, type ItemStatus, type Named, type SalesAccount } from "@/lib/types";
import { bulkUpdate, deleteItems } from "../actions";

export type StockRow = {
  id: string;
  ref_number: number;
  title: string;
  subtitle: string;
  status: ItemStatus;
  listed_price: number | null;
  cost: number;
  thumb: string | null;
  location: string | null;
  account: SalesAccount | null;
  lot: string | null;
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
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={all}
            onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
            aria-label="Tout sélectionner"
          />
          <span className="flex-1">Article</span>
          <span className="hidden w-28 md:block">Emplacement</span>
          <span className="hidden w-24 text-right md:block">Coût</span>
          <span className="w-20 text-right">Prix</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const margin = r.listed_price != null && IN_STOCK.includes(r.status) ? r.listed_price - r.cost : null;
            return (
              <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 ${selected.has(r.id) ? "bg-accent-soft" : ""}`}>
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
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted">
                      {ref(r.ref_number)}
                      {r.subtitle && ` · ${r.subtitle}`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.account && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                          <span className="h-2 w-2 rounded-full" style={{ background: r.account.color }} />
                          {r.account.name}
                        </span>
                      )}
                      {r.location && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted md:hidden">
                          <MapPin size={11} /> {r.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <span className="hidden w-28 truncate text-xs text-muted md:block">{r.location ?? "—"}</span>
                <span className="hidden w-24 text-right text-sm text-muted md:block">{euro(r.cost)}</span>
                <div className="w-20 text-right">
                  <p className="text-sm font-medium">{r.listed_price != null ? euro(r.listed_price) : "—"}</p>
                  {margin != null && (
                    <p className={`text-[11px] ${margin >= 0 ? "text-good" : "text-bad"}`}>
                      {margin >= 0 ? "+" : ""}
                      {euro(margin)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-24 z-30 md:bottom-6 md:left-auto md:right-8 md:w-auto">
          <div className="card flex flex-wrap items-center gap-2 p-3 shadow-2xl">
            <span className="mr-1 text-sm font-medium">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
            <select
              className="input h-9 w-auto"
              disabled={pending}
              value=""
              onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { status: e.target.value }))}
            >
              <option value="">Changer le statut…</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            <select
              className="input h-9 w-auto"
              disabled={pending}
              value=""
              onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { location_id: e.target.value === "none" ? null : e.target.value }))}
            >
              <option value="">Ranger dans…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
              <option value="none">Aucun emplacement</option>
            </select>
            {accounts.length > 1 && (
              <select
                className="input h-9 w-auto"
                disabled={pending}
                value=""
                onChange={(e) => e.target.value && run(() => bulkUpdate(ids, { sales_account_id: e.target.value }))}
              >
                <option value="">Compte de vente…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Link className="btn-ghost h-9" href={`/etiquettes?ids=${ids.join(",")}`}>
              Étiquettes
            </Link>
            <button
              className="btn-danger h-9"
              disabled={pending}
              onClick={() => confirm(`Supprimer ${selected.size} article(s) ? Cette action est définitive.`) && run(() => deleteItems(ids))}
            >
              Supprimer
            </button>
            <button className="btn-ghost h-9" onClick={() => setSelected(new Set())}>Annuler</button>
          </div>
        </div>
      )}
    </>
  );
}
