import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { loadCosts, loadProfile, saleMargin, signPhotos } from "@/lib/data";
import { STATUS_META, IN_STOCK, euro, pct, ref, daysSince } from "@/lib/format";
import { PageHeader, Stat, Thumb, Empty } from "@/components/ui";
import type { ItemStatus } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(supabase, user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dormantBefore = new Date(Date.now() - profile.dormant_days * 86_400_000).toISOString();

  const [statusRows, monthSales, dormant, allSales] = await Promise.all([
    supabase.from("items").select("id,status"),
    supabase.from("sales").select("*").gte("sold_on", monthStart),
    supabase
      .from("items")
      .select("id,ref_number,title,listed_price,listed_at,photos")
      .eq("status", "en_ligne")
      .lt("listed_at", dormantBefore)
      .order("listed_at")
      .limit(6),
    supabase.from("sales").select("item_id,sold_on"),
  ]);

  const items = statusRows.data ?? [];
  const counts = new Map<ItemStatus, number>();
  items.forEach((i) => counts.set(i.status, (counts.get(i.status) ?? 0) + 1));

  const costs = await loadCosts(supabase);
  const stockValue = items.filter((i) => IN_STOCK.includes(i.status)).reduce((s, i) => s + (costs.get(i.id) ?? 0), 0);

  const sales = monthSales.data ?? [];
  const revenue = sales.reduce((s, x) => s + Number(x.sale_price), 0);
  const profit = sales.reduce((s, x) => s + saleMargin(x, costs.get(x.item_id) ?? 0), 0);

  // durée moyenne avant vente (jours entre mise en ligne et vente)
  const soldIds = (allSales.data ?? []).map((s) => s.item_id);
  let avgDays: number | null = null;
  if (soldIds.length) {
    const { data: listed } = await supabase.from("items").select("id,listed_at").in("id", soldIds.slice(0, 500));
    const listedMap = new Map((listed ?? []).map((r) => [r.id, r.listed_at]));
    const spans = (allSales.data ?? [])
      .map((s) => {
        const l = listedMap.get(s.item_id);
        if (!l) return null;
        const days = Math.round((Date.parse(s.sold_on) - Date.parse(String(l).slice(0, 10))) / 86_400_000);
        return Math.max(0, days);
      })
      .filter((x): x is number => x !== null);
    if (spans.length) avgDays = Math.round(spans.reduce((a, b) => a + b, 0) / spans.length);
  }

  const dormantItems = dormant.data ?? [];
  const thumbs = await signPhotos(supabase, dormantItems.map((d) => d.photos?.[0]).filter(Boolean));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Bienvenue 👋" subtitle="Commencez par créer votre premier lot ou ajouter des articles." />
        <Empty
          title="Votre stock est vide"
          text="Créez un lot (un arrivage) pour répartir automatiquement son coût sur chaque article, ou ajoutez des articles un par un. Vous pouvez aussi importer un fichier Excel depuis les réglages."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/lots" className="btn-primary">Créer un lot</Link>
              <Link href="/ajout" className="btn-ghost">Ajouter un article</Link>
              <Link href="/reglages#import" className="btn-ghost">Importer</Link>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Accueil" subtitle={`Vos chiffres de ${monthLabel}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bénéfice du mois" value={euro(profit)} tone={profit >= 0 ? "good" : "bad"} hint={`${sales.length} vente${sales.length > 1 ? "s" : ""}`} />
        <Stat label="Chiffre d'affaires" value={euro(revenue)} hint={revenue ? `Marge ${pct(profit / revenue)}` : undefined} />
        <Stat label="Valeur du stock" value={euro(stockValue)} hint="au coût d'achat" />
        <Stat label="Délai moyen de vente" value={avgDays === null ? "—" : `${avgDays} j`} hint="de la mise en ligne à la vente" />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Où en sont vos articles</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {(Object.keys(STATUS_META) as ItemStatus[]).map((s) => (
            <Link key={s} href={`/stock?status=${s}`} className="card p-3 transition hover:border-accent">
              <p className="text-xl font-semibold">{counts.get(s) ?? 0}</p>
              <p className="truncate text-xs text-muted">{STATUS_META[s].label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Articles qui dorment (en ligne depuis plus de {profile.dormant_days} jours)</h2>
        </div>
        {dormantItems.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Aucun article ne dort. 👌</p>
        ) : (
          <div className="card divide-y divide-border">
            {dormantItems.map((d) => (
              <Link key={d.id} href={`/stock/${d.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                <Thumb url={thumbs.get(d.photos?.[0])} alt={d.title} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted">{ref(d.ref_number)} · en ligne depuis {daysSince(d.listed_at)} jours</p>
                </div>
                <p className="text-sm font-medium">{euro(d.listed_price)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
