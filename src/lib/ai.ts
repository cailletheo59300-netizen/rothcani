import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5-5";
// Tarifs Claude Opus 5.5 (USD par million de jetons) — pour le suivi des coûts dans l'admin.
const PRICE_IN = 4;
const PRICE_OUT = 20;
export const DAILY_LIMIT = 60;

export type ListingSuggestion = {
  title: string;
  description: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  color: string | null;
  price_low: number;
  price_high: number;
  price_suggested: number;
  notes: string | null;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "brand",
    "category",
    "size",
    "condition",
    "color",
    "price_low",
    "price_high",
    "price_suggested",
    "notes",
  ],
  properties: {
    title: { type: "string", description: "Titre d'annonce Vinted, 40 à 70 caractères" },
    description: { type: "string", description: "Description prête à coller sur Vinted" },
    brand: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    size: { type: ["string", "null"] },
    condition: {
      type: ["string", "null"],
      enum: ["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant", null],
    },
    color: { type: ["string", "null"] },
    price_low: { type: "number" },
    price_high: { type: "number" },
    price_suggested: { type: "number" },
    notes: { type: ["string", "null"], description: "Points à vérifier par le vendeur avant de publier" },
  },
} as const;

const SYSTEM = `Tu aides un revendeur français à rédiger ses annonces Vinted à partir de photos d'un article de seconde main.

Ce que tu produis :
- Un titre clair qui reprend ce qu'un acheteur tape dans la recherche : type d'article, marque, détail distinctif, couleur, taille si connue.
- Une description en français naturel, comme l'écrirait une vraie personne : 3 à 6 phrases courtes, ton simple et sympathique, sans formules marketing ni avalanche d'émojis (un ou deux au plus, ou aucun). Mentionne la matière, la coupe, l'état et les défauts visibles. Termine par une ligne de 4 à 6 mots-clés précédés de #.
- Une fourchette de prix réaliste pour de la seconde main sur Vinted en France, en euros, selon la marque, le type et l'état.

Règles :
- N'invente rien. Si la marque, la taille ou la matière ne se voient pas sur les photos ni dans les infos fournies, mets null et ne les affirme pas dans la description.
- Les infos saisies par le vendeur priment sur ce que tu crois voir.
- Si un défaut est visible (tache, bouloche, accroc), dis-le honnêtement dans la description.
- Dans "notes", liste brièvement ce que le vendeur doit vérifier (étiquette de taille illisible, matière à confirmer…), ou null.`;

export async function generateListing(input: {
  images: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }[];
  known: Record<string, string | number | null>;
}) {
  const client = new Anthropic();
  const knownLines = Object.entries(input.known)
    .filter(([, v]) => v !== null && v !== "")
    .map(([k, v]) => `- ${k} : ${v}`)
    .join("\n");

  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          ...input.images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
          })),
          {
            type: "text" as const,
            text: knownLines
              ? `Infos déjà saisies par le vendeur :\n${knownLines}\n\nRédige l'annonce.`
              : "Rédige l'annonce.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("L'IA n'a pas pu traiter ces photos.");
  if (response.stop_reason === "max_tokens") throw new Error("Réponse de l'IA incomplète, réessayez.");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Réponse de l'IA vide.");
  const suggestion = JSON.parse(text.text) as ListingSuggestion;

  const inTok = response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
  const outTok = response.usage.output_tokens;
  return {
    suggestion,
    usage: { model: response.model, input_tokens: inTok, output_tokens: outTok, cost_usd: (inTok * PRICE_IN + outTok * PRICE_OUT) / 1_000_000 },
  };
}
