import type { ItemStatus } from "./types";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const euro = (n: number | null | undefined) => eur.format(Number(n ?? 0));

export const pct = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 }).format(n);

export const date = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "—";

export const ref = (n: number) => `A-${String(n).padStart(4, "0")}`;

export const daysSince = (d: string | null | undefined) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : 0;

export const STATUS_META: Record<ItemStatus, { label: string; short: string; tone: string }> = {
  arrivage: { label: "Arrivage", short: "Arrivage", tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  tri: { label: "Tri", short: "Tri", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  preparation: { label: "Préparation", short: "Prépa", tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  photos: { label: "Photos", short: "Photos", tone: "bg-pink-500/15 text-pink-700 dark:text-pink-300" },
  pret: { label: "Prêt à publier", short: "Prêt", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  en_ligne: { label: "En ligne", short: "En ligne", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  vendu: { label: "Vendu", short: "Vendu", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  expedie: { label: "Expédié", short: "Expédié", tone: "bg-emerald-700/15 text-emerald-800 dark:text-emerald-200" },
  ecarte: { label: "Écarté", short: "Écarté", tone: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

/** Statuts où l'article est encore en stock (non vendu, non écarté). */
export const IN_STOCK: ItemStatus[] = ["arrivage", "tri", "preparation", "photos", "pret", "en_ligne"];

export const num = (v: FormDataEntryValue | null) => {
  if (v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
export const str = (v: FormDataEntryValue | null) => {
  const s = v === null ? "" : String(v).trim();
  return s === "" ? null : s;
};
