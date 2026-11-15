import Link from "next/link";
import { redirect } from "next/navigation";
import { Checklist, type Progress } from "@/components/checklist";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile, signPhotos } from "@/lib/data";
import { STATUS_META, euro, pct, ref, daysSince } from "@/lib/format";
import { PageHeader, Stat, Thumb, Empty } from "@/components/ui";
import type { ItemStatus } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(supabase, user.id);
  if (!profile.onboarded_at) redirect("/bienvenue");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dormantBefore = new Date(Date.now() - profile.dormant_days * 86_400_000).toISOString();

  type Stats = {
    counts: Partial<Record<ItemStatus, number>>;
    items_total: number;
    stock_value: number;
    month_sales: number;
    month_revenue: number;
    month_profit: number;
    avg_days_to_sell: number | null;
    dormant_count: number;
  };
  const [statsRes, dormant, progressRes] = await Promise.all([
    supabase.rpc("dashboard_stats", { month_start: monthStart, dormant_before: dormantBefore }),
    supabase
      .from("items")
      .select("id,ref_number,title,listed_price,listed_at,photos")
      .eq("status", "en_ligne")
      .lt("listed_at", dormantBefore)
      .order("listed_at")
      .limit(6),
    supabase.rpc("onboarding_progress"),
  ]);
  const checklist = profile.checklist_hidden ? null : <Checklist progress={progressRes.data as Progress} />;
  const st = statsRes.data as Stats;
  const counts = new Map(Object.entries(st.counts) as [ItemStatus, number][]);
  const stockValue = Number(st.stock_value);
  const revenue = Number(st.month_revenue);
  const profit = Number(st.month_profit);
  const avgDays = st.avg_days_to_sell;

  const dormantItems = dormant.data ?? [];
  const thumbs = await signPhotos(supabase, dormantItems.map((d) => d.photos?.[0]).filter(Boolean));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);

  if (st.items_total === 0) {
    return (
      <>
        <PageHeader title={`Bienvenue${profile.display_name ? ` ${profile.display_name}` : ""} 👋`} subtitle="Commencez par créer votre premier lot ou ajouter des articles." />
        {checklist}
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
      {checklist}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bénéfice du mois" value={euro(profit)} tone={profit >= 0 ? "good" : "bad"} hint={`${st.month_sales} vente${st.month_sales > 1 ? "s" : ""}`} />
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
          <h2 className="text-sm font-medium text-muted">Articles qui dorment ({st.dormant_count}, en ligne depuis plus de {profile.dormant_days} jours)</h2>
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
