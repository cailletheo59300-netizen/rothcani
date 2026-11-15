import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Checklist, type Progress } from "@/components/checklist";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/data";
import { PHASES, euro, pct } from "@/lib/format";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";
import type { ItemStatus } from "@/lib/types";

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

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(supabase, user.id);
  if (!profile.onboarded_at) redirect("/bienvenue");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dormantBefore = new Date(Date.now() - profile.dormant_days * 86_400_000).toISOString();

  const [statsRes, progressRes] = await Promise.all([
    supabase.rpc("dashboard_stats", { month_start: monthStart, dormant_before: dormantBefore }),
    supabase.rpc("onboarding_progress"),
  ]);
  const st = statsRes.data as Stats;
  const n = (s: ItemStatus) => st.counts[s] ?? 0;
  const checklist = profile.checklist_hidden ? null : <Checklist progress={progressRes.data as Progress} />;
  const hello = profile.display_name ? `Bonjour ${profile.display_name}` : "Bonjour";
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);

  if (st.items_total === 0) {
    return (
      <>
        <PageHeader title={hello} subtitle="Votre stock est prêt à être rempli." />
        {checklist}
        <Empty
          title="Aucun article pour l'instant"
          text="Créez un lot pour répartir automatiquement le prix d'un arrivage sur ses articles, ou ajoutez vos articles un par un."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/lots/nouveau" className="btn-primary">Créer un lot</Link>
              <Link href="/ajout" className="btn-ghost">Ajouter un article</Link>
            </div>
          }
        />
      </>
    );
  }

  const revenue = Number(st.month_revenue);
  const profit = Number(st.month_profit);
  const inStock = PHASES[0].statuses.reduce((a, s) => a + n(s), 0) + n("en_ligne");

  const todo = [
    { count: n("vendu"), text: n("vendu") > 1 ? "colis à expédier" : "colis à expédier", href: "/ventes" },
    { count: n("pret"), text: n("pret") > 1 ? "articles prêts à publier" : "article prêt à publier", href: "/stock?status=pret" },
    {
      count: st.dormant_count,
      text: `${st.dormant_count > 1 ? "articles en ligne" : "article en ligne"} depuis plus de ${profile.dormant_days} jours`,
      href: "/stock?dormant=1",
    },
  ].filter((t) => t.count > 0);

  return (
    <>
      <PageHeader title={hello} subtitle={`Votre activité en ${monthLabel}`} />
      {checklist}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          className="col-span-2 sm:col-span-1"
          label="Bénéfice du mois"
          value={euro(profit)}
          tone={profit > 0 ? "good" : profit < 0 ? "bad" : undefined}
          hint={st.month_sales ? `${st.month_sales} vente${st.month_sales > 1 ? "s" : ""} · ${euro(revenue)} · marge ${pct(revenue ? profit / revenue : 0)}` : "Aucune vente ce mois-ci"}
        />
        <Stat label="Articles en stock" value={String(inStock)} hint={`${euro(Number(st.stock_value))} d'achat`} />
        <Stat label="Délai de vente" value={st.avg_days_to_sell === null ? "—" : `${st.avg_days_to_sell} j`} hint="en moyenne avant la vente" />
      </div>

      <Section title="Vos articles" className="mt-8">
        <div className="card grid grid-cols-3 divide-x divide-border">
          {PHASES.map((p) => {
            const count = p.statuses.reduce((a, s) => a + n(s), 0);
            return (
              <Link key={p.key} href={`/stock?vue=${p.key}`} className="group px-3 py-4 transition-colors first:rounded-l-2xl last:rounded-r-2xl hover:bg-surface-2 sm:px-5">
                <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted sm:gap-2 sm:text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
                  {p.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{count}</p>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section title="À faire" className="mt-8">
        {todo.length === 0 ? (
          <p className="card px-5 py-4 text-sm text-muted">Rien d&apos;urgent : tout est à jour.</p>
        ) : (
          <ul className="card divide-y divide-border">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center gap-4 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-2">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-accent-soft px-2 text-sm font-semibold text-accent">{t.count}</span>
                  <span className="flex-1 text-sm">{t.text}</span>
                  <ChevronRight size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
