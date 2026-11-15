import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, MapPin, QrCode } from "lucide-react";
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
  const potential = item.listed_price != null ? item.listed_price - cost : null;

  return (
    <>
      <PageHeader
        back={{ href: "/stock", label: "Stock" }}
        action={
          <div className="flex gap-2">
            <form action={duplicateItem.bind(null, item.id)}>
              <Submit className="btn-ghost">
                <Copy size={16} /> Dupliquer
              </Submit>
            </form>
            <Link href={`/etiquettes?ids=${item.id}`} className="btn-ghost">
              <QrCode size={16} /> Étiquette
            </Link>
          </div>
        }
        title={item.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {ref(item.ref_number)} <StatusBadge status={item.status} />
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {location.name}
              </span>
            )}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-medium">Photos</h2>
            <PhotoManager itemId={item.id} photos={item.photos} urls={Object.fromEntries(urls)} />
          </section>

          <AiListing itemId={item.id} hasPhotos={item.photos.length > 0} description={item.description} />

          <form key={`${item.status}-${item.status_changed_at}-${item.title}-${item.description ?? ""}-${item.listed_price ?? ""}`} action={updateItem.bind(null, item.id)} className="card space-y-4 p-4">
            <h2 className="text-sm font-medium">Informations</h2>
            <ItemFields item={item} lots={refs.lots} locations={refs.locations} accounts={refs.accounts} />
            <div className="flex justify-end">
              <Submit>Enregistrer</Submit>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-medium">Rentabilité</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Coût d'achat" value={euro(cost)} hint={item.manual_cost != null ? "saisi à la main" : lot ? `réparti depuis « ${lot.name} »` : undefined} />
              <Row label="Prix affiché" value={item.listed_price != null ? euro(item.listed_price) : "—"} />
              {!sale && potential != null && <Row label="Marge potentielle" value={euro(potential)} tone={potential >= 0 ? "good" : "bad"} />}
              {sale && (
                <>
                  <Row label="Vendu" value={euro(sale.sale_price)} hint={date(sale.sold_on)} />
                  <Row label="Frais" value={`− ${euro(Number(sale.packaging_fee) + Number(sale.shipping_fee) + Number(sale.platform_fee))}`} />
                  <Row label="Marge réalisée" value={euro(saleMargin(sale, cost))} tone={saleMargin(sale, cost) >= 0 ? "good" : "bad"} strong />
                </>
              )}
            </dl>
          </section>

          {!sale && item.status !== "ecarte" && (
            <form action={createSale.bind(null, item.id)} className="card space-y-3 p-4">
              <h2 className="text-sm font-medium">Enregistrer la vente</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix de vente (€)">
                  <input name="sale_price" required inputMode="decimal" defaultValue={item.listed_price ?? ""} className="input" />
                </Field>
                <Field label="Date">
                  <input name="sold_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
                </Field>
                <Field label="Emballage (€)">
                  <input name="packaging_fee" inputMode="decimal" defaultValue={profile.default_packaging_fee} className="input" />
                </Field>
                <Field label="Envoi (€)">
                  <input name="shipping_fee" inputMode="decimal" defaultValue={profile.default_shipping_fee} className="input" />
                </Field>
                <Field label="Frais plateforme (€)">
                  <input name="platform_fee" inputMode="decimal" defaultValue={profile.default_platform_fee} className="input" />
                </Field>
                <Field label="Compte">
                  <select name="sales_account_id" defaultValue={item.sales_account_id ?? ""} className="input">
                    <option value="">—</option>
                    {refs.accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Acheteur (optionnel)" className="col-span-2">
                  <input name="buyer" className="input" />
                </Field>
              </div>
              <Submit className="btn-primary w-full">Marquer comme vendu</Submit>
            </form>
          )}

          {sale && (
            <section className="card space-y-2 p-4">
              <h2 className="text-sm font-medium">Vente</h2>
              {location && (
                <p className="rounded-xl bg-accent-soft p-3 text-sm">
                  📦 À récupérer dans <strong>{location.name}</strong>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {item.status === "vendu" && (
                  <form action={markShipped.bind(null, [item.id])}>
                    <Submit>Marquer expédié</Submit>
                  </form>
                )}
                <form action={cancelSale.bind(null, item.id)}>
                  <Submit className="btn-ghost" confirmText="Annuler la vente ? L'article repassera « En ligne ».">Annuler la vente</Submit>
                </form>
              </div>
            </section>
          )}

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-medium">Historique</h2>
            <ol className="space-y-2 text-sm">
              {(historyRes.data ?? []).map((h: { status: ItemStatus; changed_at: string }, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>{STATUS_META[h.status].label}</span>
                  <span className="text-xs text-muted">{date(h.changed_at)}</span>
                </li>
              ))}
            </ol>
            {lot && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                Lot : <Link className="underline" href={`/lots/${lot.id}`}>{lot.name}</Link>
              </p>
            )}
          </section>

          <form action={deleteItem.bind(null, item.id)}>
            <Submit className="btn-danger w-full" confirmText="Supprimer définitivement cet article et ses photos ?">Supprimer l&apos;article</Submit>
          </form>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, hint, tone, strong }: { label: string; value: string; hint?: string; tone?: "good" | "bad"; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">
        {label}
        {hint && <span className="block text-[11px]">{hint}</span>}
      </dt>
      <dd className={`${strong ? "text-base font-semibold" : "font-medium"} ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
    </div>
  );
}
