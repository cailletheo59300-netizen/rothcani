import type { SupabaseClient } from "@supabase/supabase-js";

export type LotStats = { items: number; sold: number; invested: number; recovered: number; profit: number };

/** Argent investi / récupéré par lot. Récupéré = prix de vente moins les frais de vente. */
export async function lotStats(supabase: SupabaseClient, lots: { id: string; price: number; shipping_cost: number }[]) {
  const stats = new Map<string, LotStats>();
  lots.forEach((l) =>
    stats.set(l.id, { items: 0, sold: 0, invested: Number(l.price) + Number(l.shipping_cost), recovered: 0, profit: 0 }),
  );
  if (!lots.length) return stats;
  const { data: items } = await supabase.from("items").select("id,lot_id").in("lot_id", lots.map((l) => l.id));
  const lotOf = new Map((items ?? []).map((i) => [i.id, i.lot_id as string]));
  (items ?? []).forEach((i) => stats.get(i.lot_id)!.items++);
  if (lotOf.size) {
    const { data: sales } = await supabase
      .from("sales")
      .select("item_id,sale_price,packaging_fee,shipping_fee,platform_fee")
      .in("item_id", [...lotOf.keys()]);
    (sales ?? []).forEach((s) => {
      const st = stats.get(lotOf.get(s.item_id)!)!;
      st.sold++;
      st.recovered += Number(s.sale_price) - Number(s.packaging_fee) - Number(s.shipping_fee) - Number(s.platform_fee);
    });
  }
  stats.forEach((s) => (s.profit = s.recovered - s.invested));
  return stats;
}
