import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lot, Named, Profile, SalesAccount, Supplier } from "./types";

export const PHOTO_BUCKET = "item-photos";

export async function loadRefs(supabase: SupabaseClient) {
  const [accounts, suppliers, locations, lots] = await Promise.all([
    supabase.from("sales_accounts").select("id,name,platform,color").order("created_at"),
    supabase.from("suppliers").select("id,name,kind,contact,notes").order("name"),
    supabase.from("locations").select("id,name").order("name"),
    supabase.from("lots").select("*").order("purchased_on", { ascending: false }),
  ]);
  return {
    accounts: (accounts.data ?? []) as SalesAccount[],
    suppliers: (suppliers.data ?? []) as Supplier[],
    locations: (locations.data ?? []) as Named[],
    lots: (lots.data ?? []) as Lot[],
  };
}

export async function loadProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data as Profile;
}

/** Coût d'achat de chaque article (répartition du lot calculée en base). */
export async function loadCosts(supabase: SupabaseClient, itemIds?: string[]) {
  const map = new Map<string, number>();
  if (itemIds && itemIds.length === 0) return map;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from("item_costs").select("item_id,cost").range(from, from + PAGE - 1);
    if (itemIds) q = q.in("item_id", itemIds);
    const { data } = await q;
    (data ?? []).forEach((r: { item_id: string; cost: number }) => map.set(r.item_id, Number(r.cost)));
    if (!data || data.length < PAGE || itemIds) break;
  }
  return map;
}

/** URLs signées (1 h) pour des chemins de photos privées. */
export async function signPhotos(supabase: SupabaseClient, paths: string[]) {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 3600);
  (data ?? []).forEach((d) => d.signedUrl && d.path && map.set(d.path, d.signedUrl));
  return map;
}

export function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

export const saleMargin = (
  s: { sale_price: number; packaging_fee: number; shipping_fee: number; platform_fee: number },
  cost: number,
) => Number(s.sale_price) - cost - Number(s.packaging_fee) - Number(s.shipping_fee) - Number(s.platform_fee);
