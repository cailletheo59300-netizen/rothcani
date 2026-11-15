import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { byId, loadRefs } from "@/lib/data";
import { lotStats, supplierStats } from "@/lib/lot-stats";
import { date, euro, pct } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { Plus } from "lucide-react";

export default async function LotsPage() {
  const { supabase } = await requireUser();
  const refs = await loadRefs(supabase);
  const [stats, supStats] = await Promise.all([lotStats(supabase, refs.lots), supplierStats(supabase)]);
  const supRows = refs.suppliers
    .map((sp) => ({ ...sp, s: supStats.get(sp.id) }))
    .filter((r) => r.s && r.s.lots > 0)
    .sort((a, b) => b.s!.profit - a.s!.profit);
  const suppliers = byId(refs.suppliers);

  return (
    <>
      <PageHeader
        title="Lots"
        subtitle="Ce que chaque arrivage vous a coûté et rapporté."
        action={
          <Link href="/lots/nouveau" className="btn-primary">
            <Plus size={16} /> Nouveau lot
          </Link>
        }
      />

      {refs.lots.length === 0 ? (
        <Empty title="Aucun lot" text="Un lot regroupe des articles achetés ensemble. Son prix est réparti automatiquement sur chaque article." action={<Link href="/lots/nouveau" className="btn-primary">Créer un lot</Link>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {refs.lots.map((l) => {
            const s = stats.get(l.id)!;
            const progress = s.invested > 0 ? Math.min(1, s.recovered / s.invested) : 0;
            return (
              <Link key={l.id} href={`/lots/${l.id}`} className="card block p-5 transition-colors hover:bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {date(l.purchased_on)}
                      {l.supplier_id && suppliers.get(l.supplier_id) ? ` · ${suppliers.get(l.supplier_id)!.name}` : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${s.profit >= 0 ? "text-good" : "text-muted"}`}>
                    {s.profit >= 0 ? "+" : ""}
                    {euro(s.profit)}
                  </p>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[13px] text-muted">
                  <span>{pct(progress)} remboursé</span>
                  <span>
                    {s.sold} vendu{s.sold > 1 ? "s" : ""} sur {s.items}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {supRows.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-3">Par fournisseur</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Fournisseur</th>
                  <th className="px-3 py-2 text-right font-medium">Lots</th>
                  <th className="px-3 py-2 text-right font-medium">Vendus</th>
                  <th className="px-3 py-2 text-right font-medium">Investi</th>
                  <th className="px-3 py-2 text-right font-medium">Récupéré</th>
                  <th className="px-3 py-2 text-right font-medium">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supRows.map(({ id, name, s }) => (
                  <tr key={id}>
                    <td className="px-3 py-2 font-medium">{name}</td>
                    <td className="px-3 py-2 text-right">{s!.lots}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {s!.sold} / {s!.items}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-muted">{euro(s!.invested)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-muted">{euro(s!.recovered)}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${s!.profit >= 0 ? "text-good" : "text-muted"}`}>
                      {s!.profit >= 0 ? "+" : ""}
                      {euro(s!.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </section>
      )}
    </>
  );
}
