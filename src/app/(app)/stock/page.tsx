import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { byId, loadCosts, loadRefs, signPhotos } from "@/lib/data";
import { STATUS_META } from "@/lib/format";
import { PageHeader, Empty } from "@/components/ui";
import { StockList, type StockRow } from "./stock-list";
import { STATUSES, type Item } from "@/lib/types";

const PAGE_SIZE = 50;

type SP = { q?: string; status?: string; lot?: string; location?: string; account?: string; page?: string };

export default async function StockPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const refs = await loadRefs(supabase);
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase
    .from("items")
    .select("*", { count: "exact" })
    .order("ref_number", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.lot) query = query.eq("lot_id", sp.lot);
  if (sp.location) query = query.eq("location_id", sp.location);
  if (sp.account) query = query.eq("sales_account_id", sp.account);
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
  const [costs, thumbs] = await Promise.all([
    loadCosts(supabase, items.map((i) => i.id)),
    signPhotos(supabase, items.map((i) => i.photos[0]).filter(Boolean)),
  ]);
  const locs = byId(refs.locations);
  const accs = byId(refs.accounts);
  const lots = byId(refs.lots);

  const rows: StockRow[] = items.map((i) => ({
    id: i.id,
    ref_number: i.ref_number,
    title: i.title,
    subtitle: [i.brand, i.size, i.condition].filter(Boolean).join(" · "),
    status: i.status,
    listed_price: i.listed_price,
    cost: costs.get(i.id) ?? 0,
    thumb: thumbs.get(i.photos[0]) ?? null,
    location: i.location_id ? locs.get(i.location_id)?.name ?? null : null,
    account: i.sales_account_id ? accs.get(i.sales_account_id) ?? null : null,
    lot: i.lot_id ? lots.get(i.lot_id)?.name ?? null : null,
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(q || sp.status || sp.lot || sp.location || sp.account);
  const pageHref = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(p));
    return `/stock?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${total} article${total > 1 ? "s" : ""}${hasFilter ? " (filtrés)" : ""}`}
        action={
          <Link href="/ajout" className="btn-primary hidden md:inline-flex">
            <Plus size={16} /> Ajouter
          </Link>
        }
      />

      <form className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6" action="/stock">
        <input name="q" defaultValue={q} placeholder="Rechercher : titre, marque, taille, A-0012…" className="input col-span-2" />
        <select name="status" defaultValue={sp.status ?? ""} className="input">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select name="lot" defaultValue={sp.lot ?? ""} className="input">
          <option value="">Tous les lots</option>
          {refs.lots.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select name="location" defaultValue={sp.location ?? ""} className="input">
          <option value="">Tous les emplacements</option>
          {refs.locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="account" defaultValue={sp.account ?? ""} className="input">
            <option value="">Tous les comptes</option>
            {refs.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button className="btn-ghost px-3">OK</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty
          title={hasFilter ? "Aucun article ne correspond" : "Aucun article pour l'instant"}
          text={hasFilter ? "Essayez d'élargir la recherche ou de retirer un filtre." : "Ajoutez vos premiers articles, ou créez un lot."}
          action={
            hasFilter ? (
              <Link href="/stock" className="btn-ghost">Effacer les filtres</Link>
            ) : (
              <Link href="/ajout" className="btn-primary">Ajouter des articles</Link>
            )
          }
        />
      ) : (
        <StockList rows={rows} locations={refs.locations} accounts={refs.accounts} />
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-ghost" href={pageHref(page - 1)}>← Précédent</Link>}
          <span className="text-muted">Page {page} / {pages}</span>
          {page < pages && <Link className="btn-ghost" href={pageHref(page + 1)}>Suivant →</Link>}
        </div>
      )}
    </>
  );
}
