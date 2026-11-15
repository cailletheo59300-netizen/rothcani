import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { byId, loadProfile, loadRefs, signPhotos } from "@/lib/data";
import { PHASES, STATUS_META } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { StockList, type StockRow } from "./stock-list";
import { STATUSES, type Item } from "@/lib/types";

const PAGE_SIZE = 50;

type SP = { q?: string; vue?: string; status?: string; lot?: string; location?: string; account?: string; dormant?: string; page?: string };

export default async function StockPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [refs, profile] = await Promise.all([loadRefs(supabase), loadProfile(supabase, user.id)]);
  const page = Math.max(1, Number(sp.page) || 1);
  const phase = PHASES.find((p) => p.key === sp.vue);

  let query = supabase
    .from("items")
    .select("*", { count: "exact" })
    .order("ref_number", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) query = query.eq("status", sp.status);
  else if (phase) query = query.in("status", phase.statuses);
  if (sp.lot) query = query.eq("lot_id", sp.lot);
  if (sp.location) query = query.eq("location_id", sp.location);
  if (sp.account) query = query.eq("sales_account_id", sp.account);
  if (sp.dormant) {
    query = query.eq("status", "en_ligne").lt("listed_at", new Date(Date.now() - profile.dormant_days * 86_400_000).toISOString());
  }
  const q = (sp.q ?? "").trim();
  if (q) {
    const refMatch = q.match(/^a?-?0*(\d+)$/i);
    if (refMatch) query = query.eq("ref_number", Number(refMatch[1]));
    else {
      const safe = q.replace(/[%,()*\\]/g, " ");
      query = query.or(`title.ilike.%${safe}%,brand.ilike.%${safe}%,size.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
  }

  const { data, count } = await query;
  const items = (data ?? []) as Item[];
  const thumbs = await signPhotos(supabase, items.map((i) => i.photos[0]).filter(Boolean));
  const locs = byId(refs.locations);

  const rows: StockRow[] = items.map((i) => ({
    id: i.id,
    ref_number: i.ref_number,
    title: i.title,
    subtitle: [i.brand, i.size].filter(Boolean).join(" · "),
    status: i.status,
    listed_price: i.listed_price,
    thumb: thumbs.get(i.photos[0]) ?? null,
    location: i.location_id ? locs.get(i.location_id)?.name ?? null : null,
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const advanced = Boolean(sp.status || sp.lot || sp.location || sp.account || sp.dormant);
  const hasFilter = Boolean(q || phase || advanced);
  const href = (patch: Partial<SP>) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = u.toString();
    return s ? `/stock?${s}` : "/stock";
  };
  const tabs = [{ key: undefined, label: "Tout" }, ...PHASES.map((p) => ({ key: p.key, label: p.label }))];

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${total} article${total > 1 ? "s" : ""}${hasFilter ? " trouvés" : ""}`}
        action={
          <Link href="/ajout" className="btn-primary hidden md:inline-flex">
            <Plus size={16} /> Ajouter
          </Link>
        }
      />

      <form action="/stock" className="relative mb-3">
        {sp.vue && <input type="hidden" name="vue" value={sp.vue} />}
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Rechercher : titre, marque, A-0012" className="input h-11 pl-10" />
      </form>

      <div className="mb-4 flex items-center gap-2">
        <nav className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1" aria-label="Étapes">
          {tabs.map((t) => {
            const on = (sp.vue ?? undefined) === t.key && !sp.status && !sp.dormant;
            return (
              <Link
                key={t.label}
                href={href({ vue: t.key, status: undefined, dormant: undefined })}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm transition-colors ${
                  on ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <details className="group relative" open={advanced}>
          <summary className={`btn-ghost h-10 px-3 ${advanced ? "border-accent text-accent" : ""}`} aria-label="Filtres">
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filtres</span>
          </summary>
          <form action="/stock" className="card absolute right-0 z-20 mt-2 w-72 space-y-3 p-4 shadow-xl">
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <Select name="status" label="Statut précis" value={sp.status} options={STATUSES.map((s) => [s, STATUS_META[s].label])} />
            <Select name="lot" label="Lot" value={sp.lot} options={refs.lots.map((l) => [l.id, l.name])} />
            <Select name="location" label="Emplacement" value={sp.location} options={refs.locations.map((l) => [l.id, l.name])} />
            {refs.accounts.length > 1 && <Select name="account" label="Compte" value={sp.account} options={refs.accounts.map((a) => [a.id, a.name])} />}
            <div className="flex gap-2 pt-1">
              <Link href={href({ status: undefined, lot: undefined, location: undefined, account: undefined, dormant: undefined })} className="btn-ghost flex-1">
                Effacer
              </Link>
              <button className="btn-primary flex-1">Appliquer</button>
            </div>
          </form>
        </details>
      </div>

      {sp.dormant && (
        <p className="mb-3 text-sm text-muted">
          Articles en ligne depuis plus de {profile.dormant_days} jours : pensez à baisser le prix ou refaire les photos.
        </p>
      )}

      {rows.length === 0 ? (
        <Empty
          title={hasFilter ? "Aucun article trouvé" : "Aucun article pour l'instant"}
          text={hasFilter ? "Essayez une autre recherche ou retirez un filtre." : "Ajoutez vos premiers articles ou créez un lot."}
          action={
            hasFilter ? (
              <Link href="/stock" className="btn-ghost">Tout afficher</Link>
            ) : (
              <Link href="/ajout" className="btn-primary">Ajouter des articles</Link>
            )
          }
        />
      ) : (
        <StockList rows={rows} locations={refs.locations} accounts={refs.accounts} />
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-ghost" href={href({ page: String(page - 1) })}>Précédent</Link>}
          <span className="text-muted">
            Page {page} sur {pages}
          </span>
          {page < pages && <Link className="btn-ghost" href={href({ page: String(page + 1) })}>Suivant</Link>}
        </div>
      )}
    </>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input">
        <option value="">Tous</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
