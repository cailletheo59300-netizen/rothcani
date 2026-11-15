"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { DAILY_LIMIT, generateListing, type ListingSuggestion } from "@/lib/ai";
import { PHOTO_BUCKET } from "@/lib/data";
import type { Item } from "@/lib/types";

const MAX_PHOTOS = 4;

export type GenerateResult = { ok: true; suggestion: ListingSuggestion } | { ok: false; error: string };

export async function generateForItem(itemId: string): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "L'IA n'est pas encore configurée (clé API manquante côté serveur)." };
  const { supabase, user } = await requireUser();

  const { data } = await supabase.from("items").select("*").eq("id", itemId).maybeSingle();
  if (!data) return { ok: false, error: "Article introuvable." };
  const item = data as Item;
  if (item.photos.length === 0) return { ok: false, error: "Ajoutez au moins une photo pour que l'IA puisse rédiger l'annonce." };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return { ok: false, error: `Limite de ${DAILY_LIMIT} annonces générées par 24 h atteinte.` };

  const images = [];
  for (const path of item.photos.slice(0, MAX_PHOTOS)) {
    const { data: blob } = await supabase.storage.from(PHOTO_BUCKET).download(path);
    if (blob) images.push({ data: Buffer.from(await blob.arrayBuffer()).toString("base64"), mediaType: "image/jpeg" as const });
  }
  if (!images.length) return { ok: false, error: "Impossible de lire les photos." };

  try {
    const { suggestion, usage } = await generateListing({
      images,
      known: {
        Titre: item.title.startsWith("Article ") ? null : item.title,
        Marque: item.brand,
        Taille: item.size,
        Catégorie: item.category,
        État: item.condition,
        Couleur: item.color,
        Notes: item.notes,
      },
    });
    await supabase.from("ai_usage").insert({ item_id: itemId, user_id: user.id, ...usage });
    return { ok: true, suggestion };
  } catch (e) {
    console.error("generateForItem", e);
    return { ok: false, error: "L'IA n'a pas répondu correctement. Réessayez dans un instant." };
  }
}

export async function applySuggestion(itemId: string, s: ListingSuggestion, fields: string[]) {
  const { supabase } = await requireUser();
  const patch: Record<string, unknown> = {};
  if (fields.includes("title")) patch.title = s.title;
  if (fields.includes("description")) patch.description = s.description;
  if (fields.includes("details")) {
    for (const k of ["brand", "category", "size", "condition", "color"] as const) if (s[k]) patch[k] = s[k];
  }
  if (fields.includes("price")) patch.listed_price = s.price_suggested;
  if (Object.keys(patch).length) await supabase.from("items").update(patch).eq("id", itemId);
  revalidatePath("/", "layout");
}
