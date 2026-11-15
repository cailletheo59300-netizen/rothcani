import type { SupabaseClient } from "@supabase/supabase-js";

export type LotStats = { items: number; sold: number; invested: number; recovered: number; profit: number };
export type SupplierStats = LotStats & { lots: number };

/** Argent investi / récupéré par lot, calculé en base. Récupéré = prix de vente moins les frais de vente. */
export async function lotStats(supabase: SupabaseClient, lots: { id: string; price: number; shipping_cost: number }[]) {
  const stats = new Map<string, LotStats>();
  lots.forEach((l) =>
    stats.set(l.id, { items: 0, sold: 0, invested: Number(l.price) + Number(l.shipping_cost), recovered: 0, profit: 0 }),
  );
  if (!lots.length) return stats;
  const { data } = await supabase.rpc("lot_stats");
  for (const r of (data ?? []) as { lot_id: string; items: number; sold: number; invested: number; recovered: number }[]) {
    if (!stats.has(r.lot_id)) continue;
    const invested = Number(r.invested);
    const recovered = Number(r.recovered);
    stats.set(r.lot_id, { items: Number(r.items), sold: Number(r.sold), invested, recovered, profit: recovered - invested });
  }
  return stats;
}

export async function supplierStats(supabase: SupabaseClient) {
  const stats = new Map<string, SupplierStats>();
  const { data } = await supabase.rpc("supplier_stats");
  for (const r of (data ?? []) as { supplier_id: string; lots: number; items: number; sold: number; invested: number; recovered: number }[]) {
    const invested = Number(r.invested);
    const recovered = Number(r.recovered);
    stats.set(r.supplier_id, { lots: Number(r.lots), items: Number(r.items), sold: Number(r.sold), invested, recovered, profit: recovered - invested });
  }
  return stats;
}
