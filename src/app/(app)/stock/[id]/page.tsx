import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, Copy, MoreHorizontal, QrCode, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { byId, loadCosts, loadProfile, loadRefs, saleMargin, signPhotos } from "@/lib/data";
import { STATUS_META, date, euro, ref } from "@/lib/format";
import { Field, PageHeader, StatusBadge } from "@/components/ui";
import { ItemFields } from "@/components/item-fields";
import { PhotoManager } from "@/components/photo-manager";
import { AiListing } from "@/components/ai-listing";
import { Submit } from "@/components/submit";
import { cancelSale, createSale, deleteItem, duplicateItem, markShipped, updateItem } from "../../actions";
import type { Item, ItemStatus, Sale } from "@/lib/types";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as Item;

  const [refs, profile, costs, saleRes, historyRes, urls] = await Promise.all([
    loadRefs(supabase),
    loadProfile(supabase, user.id),
    loadCosts(supabase, [id]),
    supabase.from("sales").select("*").eq("item_id", id).maybeSingle(),
    supabase.from("item_status_history").select("status,changed_at").eq("item_id", id).order("changed_at", { ascending: false }),
    signPhotos(supabase, item.photos),
  ]);
  const cost = costs.get(id) ?? 0;
  const sale = saleRes.data as Sale | null;
  const location = item.location_id ? byId(refs.locations).get(item.location_id) : null;
  const lot = item.lot_id ? byId(refs.lots).get(item.lot_id) : null;
  const margin = sale ? saleMargin(sale, cost) : item.listed_price != null ? item.listed_price - cost : null;
  const defaultFees = Number(profile.default_packaging_fee) + Number(profile.default_shipping_fee) + Number(profile.default_platform_fee);

  return (
    <>
      <PageHeader
        back={{ href: "/stock", label: "Stock" }}
        title={item.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{ref(item.ref_number)}</span>
            <StatusBadge status={item.status} />
            {location && <span>Rangé dans {location.name}</span>}
          </span>
        }
        action={
          <details className="relative">
            <summary className="btn-ghost h-10 w-10 px-0" aria-label="Plus d'actions">
              <MoreHorizontal size={18} />
            </summary>
            <div className="card absolute right-0 z-20 mt-2 w-52 p-1.5 shadow-xl">
              <form action={duplicateItem.bind(null, item.id)}>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                  <Copy size={15} /> Dupliquer
                </button>
              </form>
              <Link href={`/etiquettes?ids=${item.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                <QrCode size={15} /> Imprimer l&apos;étiquette
              </Link>
              <form action={deleteItem.bind(null, item.id)}>
                <Submit className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-bad hover:bg-surface-2" confirmText="Supprimer définitivement cet article et ses photos ?">
                  <Trash2 size={15} /> Supprimer
                </Submit>
              </form>
            </div>
          </details>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <PhotoManager itemId={item.id} photos={item.photos} urls={Object.fromEntries(urls)} />

          <AiListing itemId={item.id} hasPhotos={item.photos.length > 0} />

          <form
            key={`${item.status}-${item.status_changed_at}-${item.title}-${item.description ?? ""}-${item.listed_price ?? ""}`}
            action={updateItem.bind(null, item.id)}
            className="card p-5"
          >
            <ItemFields item={item} lots={refs.lots} locations={refs.locations} accounts={refs.accounts} />
            <div className="mt-8 flex justify-end border-t border-border pt-5">
              <Submit>Enregistrer les modifications</Submit>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="card p-5">
            <p className="text-sm text-muted">{sale ? "Marge réalisée" : "Marge prévue"}</p>
            <p className={`mt-1 text-[28px] font-semibold leading-tight tracking-tight ${margin == null ? "" : margin >= 0 ? "text-good" : "text-bad"}`}>
              {margin == null ? "—" : euro(margin)}
            </p>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Row label={sale ? "Vendu" : "Prix de vente"} value={sale ? euro(sale.sale_price) : item.listed_price != null ? euro(item.listed_price) : "—"} />
              <Row label="Prix d'achat" value={euro(cost)} hint={item.manual_cost == null && lot ? `réparti depuis le lot « ${lot.name} »` : undefined} />
              {sale && <Row label="Frais" value={euro(Number(sale.packaging_fee) + Number(sale.shipping_fee) + Number(sale.platform_fee))} />}
            </dl>
          </section>

          {!sale && item.status !== "ecarte" && (
            <form action={createSale.bind(null, item.id)} className="card space-y-3 p-5">
              <h2 className="font-medium">Article vendu ?</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix de vente (€)">
                  <input name="sale_price" required inputMode="decimal" defaultValue={item.listed_price ?? ""} className="input" />
                </Field>
                <Field label="Date">
                  <input name="sold_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
                </Field>
              </div>
              <details className="group">
                <summary className="flex items-center justify-between text-sm text-muted">
                  Frais : {euro(defaultFees)}
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Emballage (€)">
                    <input name="packaging_fee" inputMode="decimal" defaultValue={profile.default_packaging_fee} className="input" />
                  </Field>
                  <Field label="Envoi (€)">
                    <input name="shipping_fee" inputMode="decimal" defaultValue={profile.default_shipping_fee} className="input" />
                  </Field>
                  <Field label="Plateforme (€)">
                    <input name="platform_fee" inputMode="decimal" defaultValue={profile.default_platform_fee} className="input" />
                  </Field>
                  <Field label="Acheteur">
                    <input name="buyer" className="input" placeholder="Optionnel" />
                  </Field>
                </div>
              </details>
              <input type="hidden" name="sales_account_id" value={item.sales_account_id ?? ""} />
              <Submit className="btn-primary w-full">Enregistrer la vente</Submit>
            </form>
          )}

          {sale && (
            <section className="card space-y-3 p-5">
              <h2 className="font-medium">{item.status === "vendu" ? "À expédier" : "Vente terminée"}</h2>
              <p className="text-sm text-muted">
                Vendu le {date(sale.sold_on)}
                {location && item.status === "vendu" && (
                  <>
                    {" "}
                    · à récupérer dans <span className="font-medium text-text">{location.name}</span>
                  </>
                )}
              </p>
              {item.status === "vendu" && (
                <form action={markShipped.bind(null, [item.id])}>
                  <Submit className="btn-primary w-full">Marquer comme expédié</Submit>
                </form>
              )}
              <form action={cancelSale.bind(null, item.id)}>
                <Submit className="btn-quiet w-full" confirmText="Annuler la vente ? L'article repassera « En ligne ».">
                  Annuler la vente
                </Submit>
              </form>
            </section>
          )}

          <details className="group card p-5">
            <summary className="flex items-center justify-between text-sm font-medium">
              Historique
              <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
            </summary>
            <ol className="mt-3 space-y-2 text-sm">
              {(historyRes.data ?? []).map((h: { status: ItemStatus; changed_at: string }, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>{STATUS_META[h.status].label}</span>
                  <span className="text-muted">{date(h.changed_at)}</span>
                </li>
              ))}
            </ol>
            {lot && (
              <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                Lot : <Link className="text-text underline-offset-2 hover:underline" href={`/lots/${lot.id}`}>{lot.name}</Link>
              </p>
            )}
          </details>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
