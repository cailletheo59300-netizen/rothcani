"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { num, str } from "@/lib/format";
import { STATUSES, type ItemStatus } from "@/lib/types";

const isStatus = (s: unknown): s is ItemStatus => STATUSES.includes(s as ItemStatus);

function itemFields(fd: FormData) {
  const status = fd.get("status");
  return {
    title: str(fd.get("title")) ?? "Sans titre",
    brand: str(fd.get("brand")),
    category: str(fd.get("category")),
    size: str(fd.get("size")),
    condition: str(fd.get("condition")),
    color: str(fd.get("color")),
    lot_id: str(fd.get("lot_id")),
    location_id: str(fd.get("location_id")),
    sales_account_id: str(fd.get("sales_account_id")),
    manual_cost: num(fd.get("manual_cost")),
    listed_price: num(fd.get("listed_price")),
    floor_price: num(fd.get("floor_price")),
    description: str(fd.get("description")),
    notes: str(fd.get("notes")),
    ...(isStatus(status) ? { status } : {}),
  };
}

/* ---------- Articles ---------- */

export async function updateItem(id: string, fd: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("items").update(itemFields(fd)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function bulkUpdate(
  ids: string[],
  patch: { status?: string; location_id?: string | null; sales_account_id?: string | null; lot_id?: string | null },
) {
  const { supabase } = await requireUser();
  const clean: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error("Statut inconnu");
    clean.status = patch.status;
  }
  for (const k of ["location_id", "sales_account_id", "lot_id"] as const) {
    if (patch[k] !== undefined) clean[k] = patch[k] || null;
  }
  if (!ids.length || !Object.keys(clean).length) return;
  const { error } = await supabase.from("items").update(clean).in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteItems(ids: string[]) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("items").select("photos").in("id", ids);
  const photos = (data ?? []).flatMap((r) => r.photos as string[]).filter((p) => p.startsWith(`${user.id}/`));
  if (photos.length) await supabase.storage.from("item-photos").remove(photos);
  const { error } = await supabase.from("items").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteItem(id: string) {
  await deleteItems([id]);
  redirect("/stock");
}

export async function duplicateItem(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Article introuvable");
  const { id: _id, user_id: _u, ref_number: _r, created_at: _c, status_changed_at: _s, listed_at: _l, photos: _p, ...rest } = data;
  void [_id, _u, _r, _c, _s, _l, _p];
  const status = ["vendu", "expedie", "ecarte"].includes(rest.status) ? "pret" : rest.status;
  const { data: copy, error } = await supabase.from("items").insert({ ...rest, status }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/stock/${copy.id}`);
}

/* ---------- Ventes ---------- */

export async function createSale(itemId: string, fd: FormData) {
  const { supabase } = await requireUser();
  const sale_price = num(fd.get("sale_price"));
  if (sale_price === null) throw new Error("Prix de vente manquant");
  const { error } = await supabase.from("sales").insert({
    item_id: itemId,
    sale_price,
    sold_on: str(fd.get("sold_on")) ?? new Date().toISOString().slice(0, 10),
    packaging_fee: num(fd.get("packaging_fee")) ?? 0,
    shipping_fee: num(fd.get("shipping_fee")) ?? 0,
    platform_fee: num(fd.get("platform_fee")) ?? 0,
    sales_account_id: str(fd.get("sales_account_id")),
    buyer: str(fd.get("buyer")),
  });
  if (error) throw new Error(error.message);
  await supabase.from("items").update({ status: "vendu" }).eq("id", itemId);
  revalidatePath("/", "layout");
}

export async function cancelSale(itemId: string) {
  const { supabase } = await requireUser();
  await supabase.from("sales").delete().eq("item_id", itemId);
  await supabase.from("items").update({ status: "en_ligne" }).eq("id", itemId);
  revalidatePath("/", "layout");
}

export async function markShipped(itemIds: string[]) {
  const { supabase } = await requireUser();
  await supabase.from("items").update({ status: "expedie" }).in("id", itemIds).eq("status", "vendu");
  revalidatePath("/", "layout");
}

/* ---------- Lots ---------- */

function lotFields(fd: FormData) {
  const mode = String(fd.get("cost_mode") ?? "egal");
  return {
    name: str(fd.get("name")) ?? "Lot sans nom",
    supplier_id: str(fd.get("supplier_id")),
    purchased_on: str(fd.get("purchased_on")) ?? new Date().toISOString().slice(0, 10),
    price: num(fd.get("price")) ?? 0,
    shipping_cost: num(fd.get("shipping_cost")) ?? 0,
    cost_mode: ["egal", "prorata", "manuel"].includes(mode) ? mode : "egal",
    notes: str(fd.get("notes")),
  };
}

export async function createLot(fd: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("lots").insert(lotFields(fd)).select("id").single();
  if (error) throw new Error(error.message);
  const count = Math.min(Math.max(Math.trunc(num(fd.get("count")) ?? 0), 0), 500);
  if (count > 0) {
    const rows = Array.from({ length: count }, (_, i) => ({ title: `Article ${i + 1}`, lot_id: data.id, status: "arrivage" }));
    // insertion séquentielle par paquets : la référence est attribuée par la base
    for (let i = 0; i < rows.length; i += 50) await supabase.from("items").insert(rows.slice(i, i + 50));
  }
  revalidatePath("/", "layout");
  redirect(`/lots/${data.id}`);
}

export async function updateLot(id: string, fd: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("lots").update(lotFields(fd)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteLot(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("lots").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/lots");
}

/* ---------- Réglages ---------- */

export async function saveProfile(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({
      display_name: str(fd.get("display_name")),
      default_packaging_fee: num(fd.get("default_packaging_fee")) ?? 0,
      default_shipping_fee: num(fd.get("default_shipping_fee")) ?? 0,
      default_platform_fee: num(fd.get("default_platform_fee")) ?? 0,
      dormant_days: Math.max(1, Math.trunc(num(fd.get("dormant_days")) ?? 30)),
    })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}

const LIST_TABLES = ["locations", "suppliers", "sales_accounts"] as const;
type ListTable = (typeof LIST_TABLES)[number];

export async function addListEntry(table: ListTable, fd: FormData) {
  if (!LIST_TABLES.includes(table)) throw new Error("Table inconnue");
  const { supabase } = await requireUser();
  const name = str(fd.get("name"));
  if (!name) return;
  const row: Record<string, unknown> = { name };
  if (table === "suppliers") row.kind = str(fd.get("kind"));
  if (table === "sales_accounts") row.platform = str(fd.get("platform")) ?? "Vinted";
  await supabase.from(table).insert(row);
  revalidatePath("/", "layout");
}

export async function deleteListEntry(table: ListTable, id: string) {
  if (!LIST_TABLES.includes(table)) throw new Error("Table inconnue");
  const { supabase } = await requireUser();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}
