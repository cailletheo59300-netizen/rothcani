"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { STATUSES } from "@/lib/types";

const FIELDS = [
  { key: "title", label: "Titre", guess: ["titre", "title", "nom", "article", "désignation", "designation"] },
  { key: "brand", label: "Marque", guess: ["marque", "brand"] },
  { key: "size", label: "Taille", guess: ["taille", "size"] },
  { key: "category", label: "Catégorie", guess: ["catégorie", "categorie", "category", "type"] },
  { key: "condition", label: "État", guess: ["état", "etat", "condition"] },
  { key: "color", label: "Couleur", guess: ["couleur", "color"] },
  { key: "manual_cost", label: "Prix d'achat", guess: ["prix d'achat", "achat", "coût", "cout", "cost", "prix achat"] },
  { key: "listed_price", label: "Prix de vente affiché", guess: ["prix", "prix de vente", "price", "prix affiché"] },
  { key: "status", label: "Statut", guess: ["statut", "status", "état stock"] },
  { key: "notes", label: "Notes", guess: ["notes", "note", "commentaire", "description"] },
] as const;

const STATUS_WORDS: Record<string, string> = {
  vendu: "vendu", sold: "vendu", "en ligne": "en_ligne", online: "en_ligne", publié: "en_ligne", publie: "en_ligne",
  expédié: "expedie", expedie: "expedie", "prêt": "pret", pret: "pret", photos: "photos", préparation: "preparation",
  preparation: "preparation", tri: "tri", arrivage: "arrivage", écarté: "ecarte", ecarte: "ecarte",
};

const toNum = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v.replace(/[€\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function ImportCsv() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [state, setState] = useState<{ busy: boolean; msg?: string }>({ busy: false });

  function load(file: File | undefined) {
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        setColumns(cols);
        setRows(res.data);
        const guess: Record<string, string> = {};
        FIELDS.forEach((f) => {
          const c = cols.find((col) => (f.guess as readonly string[]).includes(col.trim().toLowerCase()));
          if (c) guess[f.key] = c;
        });
        setMap(guess);
        setState({ busy: false });
      },
    });
  }

  async function importRows() {
    if (!map.title) return setState({ busy: false, msg: "Choisissez au moins la colonne du titre." });
    setState({ busy: true });
    const items = rows
      .map((r) => {
        const get = (k: string) => (map[k] ? r[map[k]]?.trim() : undefined);
        const rawStatus = get("status")?.toLowerCase() ?? "";
        const status = STATUS_WORDS[rawStatus] ?? ((STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "en_ligne");
        return {
          title: get("title") || "",
          brand: get("brand") || null,
          size: get("size") || null,
          category: get("category") || null,
          condition: get("condition") || null,
          color: get("color") || null,
          manual_cost: toNum(get("manual_cost")),
          listed_price: toNum(get("listed_price")),
          notes: get("notes") || null,
          status,
        };
      })
      .filter((i) => i.title);
    const supabase = createClient();
    let done = 0;
    for (let i = 0; i < items.length; i += 100) {
      const { error } = await supabase.from("items").insert(items.slice(i, i + 100));
      if (error) {
        setState({ busy: false, msg: `Arrêt après ${done} articles : ${error.message}` });
        return;
      }
      done += Math.min(100, items.length - i);
    }
    setState({ busy: false, msg: `${done} articles importés.` });
    setRows([]);
    setColumns([]);
    router.refresh();
  }

  return (
    <div>
      <p className="label">Importer un fichier (CSV exporté depuis Excel, Google Sheets ou un autre outil)</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => load(e.target.files?.[0])} className="text-sm" />
      {columns.length > 0 && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted">
            {rows.length} lignes trouvées. Indiquez quelle colonne correspond à quoi (on a deviné ce qu&apos;on pouvait). Statut par défaut : « En ligne ».
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-xs">
                <span className="label">{f.label}</span>
                <select className="input h-9" value={map[f.key] ?? ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}>
                  <option value="">— ignorer —</option>
                  {columns.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {map.title && (
            <div className="rounded-xl bg-surface-2 p-3 text-xs">
              <p className="mb-1 font-medium">Aperçu</p>
              {rows.slice(0, 3).map((r, i) => (
                <p key={i} className="truncate text-muted">
                  {r[map.title]} {map.brand ? `· ${r[map.brand]}` : ""} {map.listed_price ? `· ${r[map.listed_price]}` : ""}
                </p>
              ))}
            </div>
          )}
          <button className="btn-primary" disabled={state.busy} onClick={importRows}>
            {state.busy ? "Import en cours…" : `Importer ${rows.length} articles`}
          </button>
        </div>
      )}
      {state.msg && <p className="mt-2 text-sm">{state.msg}</p>}
    </div>
  );
}
