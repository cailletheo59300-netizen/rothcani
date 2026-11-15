import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { loadCosts } from "@/lib/data";

const TABLES = {
  items: "items",
  sales: "sales",
  lots: "lots",
} as const;

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") as keyof typeof TABLES | null;
  if (!type || !(type in TABLES)) return new Response("Type inconnu", { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non connecté", { status: 401 });

  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from(TABLES[type]).select("*").range(from, from + 999);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  let out: Record<string, unknown>[] = rows.map((r) => {
    const copy = { ...r };
    delete copy.user_id;
    return copy;
  });
  if (type === "items") {
    const costs = await loadCosts(supabase);
    out = out.map((r) => ({ ...r, cout_achat: costs.get(r.id as string) ?? 0, photos: (r.photos as string[]).length }));
  }
  const csv = "﻿" + Papa.unparse(out, { delimiter: ";" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
