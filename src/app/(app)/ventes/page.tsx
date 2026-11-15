import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { byId, loadCosts, loadRefs, saleMargin } from "@/lib/data";
import { date, euro, ref } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";
import { Submit } from "@/components/submit";
import { markShipped } from "../actions";
import type { Sale } from "@/lib/types";

export default async function VentesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase } = await requireUser();
  const now = new Date();
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, mo] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);

  const [refs, salesRes, toShipRes] = await Promise.all([
    loadRefs(supabase),
    supabase.from("sales").select("*").gte("sold_on", start).lt("sold_on", end).order("sold_on", { ascending: false }),
    supabase.from("items").select("id,ref_number,title,location_id").eq("status", "vendu").order("status_changed_at"),
  ]);
  const sales = (salesRes.data ?? []) as Sale[];
  const toShip = toShipRes.data ?? [];
  const { data: soldItems } = sales.length
    ? await supabase.from("items").select("id,ref_number,title").in("id", sales.map((s) => s.item_id))
    : { data: [] };
  const itemMap = new Map((soldItems ?? []).map((i) => [i.id, i]));
  const costs = await loadCosts(supabase, sales.map((s) => s.item_id));
  const accs = byId(refs.accounts);
  const locs = byId(refs.locations);

  const revenue = sales.reduce((a, s) => a + Number(s.sale_price), 0);
  const profit = sales.reduce((a, s) => a + saleMargin(s, costs.get(s.item_id) ?? 0), 0);
  const fees = sales.reduce((a, s) => a + Number(s.packaging_fee) + Number(s.shipping_fee) + Number(s.platform_fee), 0);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));

  return (
    <>
      <PageHeader title="Ventes" subtitle="Vos ventes et les colis à envoyer." />

      {toShip.length > 0 && (
        <Section
          title={`À expédier (${toShip.length})`}
          className="mb-8"
          action={
            toShip.length > 1 ? (
              <form action={markShipped.bind(null, toShip.map((t) => t.id))}>
                <Submit className="btn-quiet h-8 text-[13px]">Tout marquer expédié</Submit>
              </form>
            ) : undefined
          }
        >
          <ul className="card divide-y divide-border">
            {toShip.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <Link href={`/stock/${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {ref(t.ref_number)}
                    {t.location_id && locs.get(t.location_id) ? ` · dans ${locs.get(t.location_id)!.name}` : ""}
                  </p>
                </Link>
                <form action={markShipped.bind(null, [t.id])}>
                  <Submit className="btn-ghost h-9">Expédié</Submit>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mb-4 flex items-center justify-between">
        <Link href={`/ventes?m=${prev}`} className="btn-ghost h-9 w-9 px-0" aria-label="Mois précédent">
          <ChevronLeft size={18} />
        </Link>
        <p className="font-medium capitalize">{monthLabel}</p>
        <Link href={`/ventes?m=${next}`} className="btn-ghost h-9 w-9 px-0" aria-label="Mois suivant">
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Bénéfice" value={euro(profit)} tone={profit > 0 ? "good" : profit < 0 ? "bad" : undefined} hint={`après ${euro(fees)} de frais`} />
        <Stat label="Chiffre d'affaires" value={euro(revenue)} />
        <Stat label="Ventes" value={String(sales.length)} />
      </div>

      <section className="mt-8">
        {sales.length === 0 ? (
          <Empty title="Aucune vente ce mois-ci" text="Pour enregistrer une vente, ouvrez la fiche de l'article vendu." />
        ) : (
          <div className="card divide-y divide-border overflow-hidden">
            {sales.map((s) => {
              const it = itemMap.get(s.item_id);
              const margin = saleMargin(s, costs.get(s.item_id) ?? 0);
              const acc = s.sales_account_id ? accs.get(s.sales_account_id) : null;
              return (
                <Link key={s.id} href={`/stock/${s.item_id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{it?.title ?? "Article"}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {it ? ref(it.ref_number) : ""} · {date(s.sold_on)}
                      {acc ? ` · ${acc.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-medium">{euro(s.sale_price)}</p>
                    <p className={`text-[13px] ${margin >= 0 ? "text-good" : "text-bad"}`}>
                      {margin >= 0 ? "+" : ""}
                      {euro(margin)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
