import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { date } from "@/lib/format";
import { PageHeader, Stat } from "@/components/ui";

type Overview = {
  role: "owner" | "marketing";
  users_total: number;
  users_7d: number;
  users_30d: number;
  active_7d: number;
  users_with_items: number;
  items_total: number;
  items_7d: number;
  sales_total: number;
  sales_30d: number;
  lots_total: number;
  signups_by_day: { day: string; n: number }[];
  items_by_day: { day: string; n: number }[];
};

type UserRow = { email: string; created_at: string; last_sign_in_at: string | null; items: number; sales: number };

export default async function AdminPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error || !data) notFound();
  const o = data as Overview;
  const users = o.role === "owner" ? (((await supabase.rpc("admin_users")).data ?? []) as UserRow[]) : [];

  return (
    <>
      <PageHeader title="Administration" subtitle={o.role === "owner" ? "Accès complet" : "Accès marketing (chiffres globaux)"} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inscrits" value={String(o.users_total)} hint={`+${o.users_7d} cette semaine · +${o.users_30d} sur 30 j`} />
        <Stat label="Actifs (7 jours)" value={String(o.active_7d)} hint="connectés dans la semaine" />
        <Stat label="Utilisent le stock" value={String(o.users_with_items)} hint={o.users_total ? `${Math.round((o.users_with_items / o.users_total) * 100)} % des inscrits` : undefined} />
        <Stat label="Abonnés payants" value="—" hint="arrive avec Stripe" />
        <Stat label="Articles créés" value={String(o.items_total)} hint={`+${o.items_7d} cette semaine`} />
        <Stat label="Lots créés" value={String(o.lots_total)} />
        <Stat label="Ventes enregistrées" value={String(o.sales_total)} hint={`${o.sales_30d} sur 30 jours`} />
        <Stat label="Revenu mensuel (MRR)" value="—" hint="arrive avec Stripe" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Bars title="Inscriptions par jour (30 derniers jours)" rows={o.signups_by_day} />
        <Bars title="Articles ajoutés par jour (30 derniers jours)" rows={o.items_by_day} />
      </div>

      {o.role === "owner" && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-muted">Utilisateurs ({users.length})</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Inscrit le</th>
                  <th className="px-3 py-2 font-medium">Dernière connexion</th>
                  <th className="px-3 py-2 text-right font-medium">Articles</th>
                  <th className="px-3 py-2 text-right font-medium">Ventes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.email}>
                    <td className="max-w-56 truncate px-3 py-2">{u.email}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{date(u.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{date(u.last_sign_in_at)}</td>
                    <td className="px-3 py-2 text-right">{u.items}</td>
                    <td className="px-3 py-2 text-right">{u.sales}</td>
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

function Bars({ title, rows }: { title: string; rows: { day: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((a, r) => a + r.n, 0);
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted">{total} au total</span>
      </div>
      <div className="flex h-32 items-end gap-[3px]">
        {rows.map((r) => (
          <div key={r.day} className="group relative flex-1" title={`${date(r.day)} : ${r.n}`}>
            <div className="rounded-t-[3px] bg-accent" style={{ height: `${(r.n / max) * 112 + (r.n ? 4 : 1)}px`, opacity: r.n ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{date(rows[0]?.day)}</span>
        <span>aujourd&apos;hui</span>
      </div>
    </section>
  );
}
