"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setItemPhotos, uploadPhotos } from "@/lib/photos";
import { ItemFields } from "@/components/item-fields";
import { num, ref, str } from "@/lib/format";
import type { Lot, Named, SalesAccount } from "@/lib/types";

type Added = { id: string; ref_number: number; title: string; photos: number };

export function QuickAdd({
  lots,
  locations,
  accounts,
  defaultLot,
}: {
  lots: Lot[];
  locations: Named[];
  accounts: SalesAccount[];
  defaultLot: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Added[]>([]);
  const [sticky, setSticky] = useState({ lot_id: defaultLot, location_id: "", status: "arrivage" });
  const [formKey, setFormKey] = useState(0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const row = {
      title: str(fd.get("title")) ?? "Sans titre",
      brand: str(fd.get("brand")),
      size: str(fd.get("size")),
      category: str(fd.get("category")),
      color: str(fd.get("color")),
      condition: str(fd.get("condition")),
      status: String(fd.get("status") ?? "arrivage"),
      listed_price: num(fd.get("listed_price")),
      floor_price: num(fd.get("floor_price")),
      manual_cost: num(fd.get("manual_cost")),
      lot_id: str(fd.get("lot_id")),
      location_id: str(fd.get("location_id")),
      sales_account_id: str(fd.get("sales_account_id")),
      description: str(fd.get("description")),
      notes: str(fd.get("notes")),
    };
    const { data, error: err } = await supabase.from("items").insert(row).select("id,ref_number,title").single();
    if (err || !data) {
      setError("L'article n'a pas pu être enregistré. Réessayez.");
      setBusy(false);
      return;
    }
    if (files.length) {
      const paths = await uploadPhotos(data.id, files);
      await setItemPhotos(data.id, paths);
    }
    setAdded((a) => [{ ...data, photos: files.length }, ...a]);
    setSticky({ lot_id: row.lot_id ?? "", location_id: row.location_id ?? "", status: row.status });
    setFiles([]);
    setFormKey((k) => k + 1); // vide le formulaire en gardant lot, emplacement et statut
    setBusy(false);
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form ref={form} key={formKey} onSubmit={submit} className="card space-y-5 p-5 lg:col-span-2">
        <div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {files.map((f, i) => (
              <div key={i} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                  aria-label="Retirer la photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-sm text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Camera size={22} />
              {files.length ? "Ajouter" : "Photos"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                setFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <ItemFields
          item={{
            lot_id: sticky.lot_id || null,
            location_id: sticky.location_id || null,
            status: sticky.status as never,
          }}
          lots={lots}
          locations={locations}
          accounts={accounts}
          mode="quick"
        />

        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-primary h-11 w-full" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer et passer au suivant"}
        </button>
      </form>

      <aside className="h-fit space-y-3">
        <h2 className="section-title">Ajoutés ({added.length})</h2>
        {added.length === 0 ? (
          <p className="text-sm text-muted">Le lot et l&apos;emplacement restent sélectionnés d&apos;un article à l&apos;autre.</p>
        ) : (
          <ul className="space-y-2">
            {added.map((a) => (
              <li key={a.id}>
                <Link href={`/stock/${a.id}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Check size={14} className="text-good" />
                  <span className="text-muted">{ref(a.ref_number)}</span>
                  <span className="truncate">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {added.length > 0 && (
          <Link href="/stock" className="btn-ghost mt-4 w-full">Voir le stock</Link>
        )}
      </aside>
    </div>
  );
}
