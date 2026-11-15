"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Star, X } from "lucide-react";
import { removePhoto, setItemPhotos, uploadPhotos } from "@/lib/photos";

export function PhotoManager({ itemId, photos, urls }: { itemId: string; photos: string[]; urls: Record<string, string> }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added = await uploadPhotos(itemId, [...files]);
    await setItemPhotos(itemId, [...photos, ...added]);
    setBusy(false);
    router.refresh();
  }
  async function remove(p: string) {
    setBusy(true);
    await setItemPhotos(itemId, photos.filter((x) => x !== p));
    await removePhoto(p);
    setBusy(false);
    router.refresh();
  }
  async function cover(p: string) {
    setBusy(true);
    await setItemPhotos(itemId, [p, ...photos.filter((x) => x !== p)]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((p, i) => (
        <div key={p} className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {urls[p] && <img src={urls[p]} alt="" className="h-full w-full object-cover" />}
          {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Couverture</span>}
          <div className="absolute right-1 top-1 flex gap-1">
            {i > 0 && (
              <button type="button" disabled={busy} onClick={() => cover(p)} className="rounded-md bg-black/60 p-1 text-white" title="Mettre en couverture">
                <Star size={12} />
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => remove(p)} className="rounded-md bg-black/60 p-1 text-white" title="Supprimer">
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted hover:border-accent hover:text-accent"
      >
        <Camera size={20} />
        {busy ? "Envoi…" : "Ajouter"}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
