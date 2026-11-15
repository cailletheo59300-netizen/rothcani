"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_SIDE = 1600;

/** Réduit la photo (1600 px max, JPEG) avant l'envoi : plus rapide sur mobile et moins de stockage. */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

/** Envoie des photos pour un article et renvoie leurs chemins de stockage. */
export async function uploadPhotos(itemId: string, files: File[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const paths: string[] = [];
  for (const f of files) {
    const blob = await compress(f);
    const path = `${user.id}/${itemId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("item-photos").upload(path, blob, { contentType: "image/jpeg" });
    if (!error) paths.push(path);
  }
  return paths;
}

export async function setItemPhotos(itemId: string, photos: string[]) {
  const supabase = createClient();
  const { error } = await supabase.from("items").update({ photos }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function removePhoto(path: string) {
  await createClient().storage.from("item-photos").remove([path]);
}
