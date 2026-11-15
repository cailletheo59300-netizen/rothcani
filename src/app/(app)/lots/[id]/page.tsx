import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, QrCode } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { loadCosts, loadRefs, signPhotos } from "@/lib/data";
import { lotStats } from "@/lib/lot-stats";
import { date, euro, ref } from "@/lib/format";
import { PageHeader, Stat, StatusBadge, Thumb } from "@/components/ui";
import { LotFields } from "@/components/lot-fields";
import { Submit } from "@/components/submit";
import { deleteLot, updateLot } from "../../actions";
import type { Item } from "@/lib/types";

const MODE_LABEL = { egal: "parts égales", prorata: "au prorata du prix affiché", manuel: "manuelle" };

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const refs = await loadRefs(supabase);
  const lot = refs.lots.find((l) => l.id === id);
  if (!lot) notFound();

  const { data } = await supabase.from("items").select("*").eq("lot_id", id).order("ref_number");
  const items = (data ?? []) as Item[];
  const [stats, costs, thumbs] = await Promise.all([
    lotStats(supabase, [lot]),
    loadCosts(supabase, items.map((i) => i.id)),
    signPhotos(supabase, items.map((i) => i.photos[0]).filter(Boolean)),
  ]);
  const s = stats.get(id)!;

  return (
    <>
      <PageHeader
        back={{ href: "/lots", label: "Lots" }}
        title={lot.name}
        subtitle={`Acheté le ${date(lot.purchased_on)} · répartition ${MODE_LABEL[lot.cost_mode]}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/etiquettes?lot=${lot.id}`} className="btn-ghost">
              <QrCode size={16} /> Étiquettes du lot
            </Link>
            <Link href={`/ajout?lot=${lot.id}`} className="btn-primary">
              <Plus size={16} /> Ajouter des articles à ce lot
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Investi" value={euro(s.invested)} hint="prix + livraison" />
        <Stat label="Récupéré" value={euro(s.recovered)} hint="ventes moins frais" />
        <Stat label="Résultat" value={euro(s.profit)} tone={s.profit >= 0 ? "good" : "bad"} />
        <Stat label="Vendus" value={`${s.sold} / ${s.items}`} hint={s.items ? `${euro(s.invested / s.items)} par article en moyenne` : undefined} />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Articles du lot</h2>
        {items.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Aucun article dans ce lot pour l&apos;instant.</p>
        ) : (
          <div className="card divide-y divide-border">
            {items.map((i) => (
              <Link key={i.id} href={`/stock/${i.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                <Thumb url={thumbs.get(i.photos[0])} alt={i.title} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted">{ref(i.ref_number)}</p>
                </div>
                <StatusBadge status={i.status} />
                <span className="w-20 text-right text-xs text-muted">coût {euro(costs.get(i.id) ?? 0)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-sm font-medium">Modifier le lot</summary>
        <form action={updateLot.bind(null, lot.id)} className="mt-4 space-y-4">
          <LotFields lot={lot} suppliers={refs.suppliers} />
          <div className="flex justify-end">
            <Submit>Enregistrer</Submit>
          </div>
        </form>
        <form action={deleteLot.bind(null, lot.id)} className="mt-4 border-t border-border pt-4">
          <Submit className="btn-danger" confirmText="Supprimer ce lot ? Ses articles sont conservés mais ne seront plus rattachés à un lot.">
            Supprimer le lot
          </Submit>
        </form>
      </details>
    </>
  );
}
