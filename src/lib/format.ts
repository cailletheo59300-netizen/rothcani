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

export type Phase = "prep" | "online" | "sold" | "out";

export const STATUS_META: Record<ItemStatus, { label: string; phase: Phase }> = {
  arrivage: { label: "Arrivage", phase: "prep" },
  tri: { label: "Tri", phase: "prep" },
  preparation: { label: "Préparation", phase: "prep" },
  photos: { label: "Photos", phase: "prep" },
  pret: { label: "Prêt à publier", phase: "prep" },
  en_ligne: { label: "En ligne", phase: "online" },
  vendu: { label: "À expédier", phase: "sold" },
  expedie: { label: "Expédié", phase: "sold" },
  ecarte: { label: "Écarté", phase: "out" },
};

/** Les 3 grandes étapes affichées à l'utilisateur (les statuts détaillés restent disponibles). */
export const PHASES: { key: Exclude<Phase, "out">; label: string; statuses: ItemStatus[]; dot: string }[] = [
  { key: "prep", label: "À préparer", statuses: ["arrivage", "tri", "preparation", "photos", "pret"], dot: "bg-amber-500" },
  { key: "online", label: "En vente", statuses: ["en_ligne"], dot: "bg-accent" },
  { key: "sold", label: "Vendus", statuses: ["vendu", "expedie"], dot: "bg-good" },
];
export const PHASE_DOT: Record<Phase, string> = { prep: "bg-amber-500", online: "bg-accent", sold: "bg-good", out: "bg-muted" };

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
