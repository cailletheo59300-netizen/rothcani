"use client";

import { useState, useTransition } from "react";
import { Boxes, FileSpreadsheet, Package, Plus, X } from "lucide-react";
import { completeOnboarding, skipOnboarding, type OnboardingData } from "./actions";

const STEPS = ["Vous", "Frais d'envoi", "Rangement", "C'est parti"];

const LOCATION_PRESETS: { label: string; values: string[] }[] = [
  { label: "Bacs 1 à 5", values: ["Bac 1", "Bac 2", "Bac 3", "Bac 4", "Bac 5"] },
  { label: "Étagères A à D", values: ["Étagère A", "Étagère B", "Étagère C", "Étagère D"] },
  { label: "Cartons 1 à 10", values: Array.from({ length: 10 }, (_, i) => `Carton ${i + 1}`) },
];

export function Wizard(props: { initialName: string; initialAccounts: string[]; initialPackaging: number; initialShipping: number }) {
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [name, setName] = useState(props.initialName);
  const [accounts, setAccounts] = useState<string[]>(props.initialAccounts.length ? props.initialAccounts : ["Mon compte Vinted"]);
  const [packaging, setPackaging] = useState(props.initialPackaging ? String(props.initialPackaging) : "");
  const [shipping, setShipping] = useState(props.initialShipping ? String(props.initialShipping) : "");
  const [locations, setLocations] = useState<string[]>([]);
  const [locInput, setLocInput] = useState("");

  const toNum = (s: string) => Number(s.replace(",", ".")) || 0;
  const finish = (next: OnboardingData["next"]) =>
    start(() =>
      completeOnboarding({
        displayName: name,
        accounts,
        packagingFee: toNum(packaging),
        shippingFee: toNum(shipping),
        locations,
        next,
      }),
    );
  const addLoc = (v: string[]) => setLocations((l) => [...new Set([...l, ...v.map((x) => x.trim()).filter(Boolean)])]);

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-9 w-9" />
        <div className="flex-1">
          <p className="text-lg font-semibold tracking-tight">Bienvenue sur Revento</p>
          <p className="text-sm text-muted">2 minutes pour régler l&apos;essentiel. Tout reste modifiable ensuite.</p>
        </div>
      </div>

      <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
            <p className={`text-[11px] ${i === step ? "font-medium text-text" : "text-muted"}`}>{s}</p>
          </li>
        ))}
      </ol>

      <div className="card space-y-5 p-5">
        {step === 0 && (
          <>
            <label className="block">
              <span className="label">Votre prénom</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Théo" />
            </label>
            <div>
              <p className="label">Vos comptes de vente</p>
              <p className="mb-2 text-xs text-muted">Leur nom sert juste à savoir où chaque article est publié. Aucune connexion à Vinted n&apos;est demandée.</p>
              <div className="space-y-2">
                {accounts.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      value={a}
                      aria-label={`Compte ${i + 1}`}
                      onChange={(e) => setAccounts((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    {accounts.length > 1 && (
                      <button className="btn-ghost px-3" onClick={() => setAccounts((l) => l.filter((_, j) => j !== i))} aria-label="Retirer">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {accounts.length < 10 && (
                <button className="mt-2 flex items-center gap-1 text-sm text-accent" onClick={() => setAccounts((l) => [...l, ""])}>
                  <Plus size={14} /> Ajouter un compte
                </button>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">
              Ces frais sont déduits de chaque vente pour calculer votre <strong className="text-text">marge réelle</strong>. Ils seront pré-remplis, vous
              pourrez les ajuster vente par vente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Emballage par colis (€)</span>
                <input className="input" inputMode="decimal" value={packaging} onChange={(e) => setPackaging(e.target.value)} placeholder="0,50" />
              </label>
              <label className="block">
                <span className="label">Envoi à votre charge (€)</span>
                <input className="input" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="0" />
              </label>
            </div>
            <p className="text-xs text-muted">Sur Vinted, l&apos;envoi est le plus souvent payé par l&apos;acheteur : laissez 0 dans ce cas.</p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted">
              Où rangez-vous vos articles ? Quand un article est vendu, Revento vous dira <strong className="text-text">où le récupérer</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              {LOCATION_PRESETS.map((p) => (
                <button key={p.label} className="btn-ghost h-8 text-xs" onClick={() => addLoc(p.values)}>
                  + {p.label}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addLoc([locInput]);
                setLocInput("");
              }}
            >
              <input className="input" value={locInput} onChange={(e) => setLocInput(e.target.value)} placeholder="Ou un nom à vous : Placard entrée…" />
              <button className="btn-ghost">Ajouter</button>
            </form>
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {locations.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                    {l}
                    <button onClick={() => setLocations((x) => x.filter((y) => y !== l))} aria-label={`Retirer ${l}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">Pas de rangement organisé ? Passez, vous pourrez en ajouter plus tard.</p>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">Par quoi voulez-vous commencer ?</p>
            <div className="grid gap-2">
              {[
                { k: "lot" as const, icon: Package, t: "J'ai reçu un arrivage", d: "Créez un lot : son prix est réparti sur chaque article pour connaître vos vraies marges." },
                { k: "article" as const, icon: Boxes, t: "J'ajoute des articles", d: "Photos depuis le téléphone, quelques infos, et au suivant." },
                { k: "import" as const, icon: FileSpreadsheet, t: "J'ai déjà un fichier Excel", d: "Importez votre stock existant en quelques clics." },
              ].map(({ k, icon: Icon, t, d }) => (
                <button
                  key={k}
                  disabled={pending}
                  onClick={() => finish(k)}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-accent hover:bg-accent-soft"
                >
                  <Icon size={20} className="mt-0.5 shrink-0 text-accent" />
                  <span>
                    <span className="block text-sm font-medium">{t}</span>
                    <span className="block text-xs text-muted">{d}</span>
                  </span>
                </button>
              ))}
            </div>
            <button className="text-sm text-muted underline" disabled={pending} onClick={() => finish("accueil")}>
              Juste découvrir l&apos;accueil
            </button>
          </>
        )}

        {step < 3 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            {step > 0 ? (
              <button className="btn-ghost" onClick={() => setStep(step - 1)}>
                Retour
              </button>
            ) : (
              <button className="text-sm text-muted hover:text-text" disabled={pending} onClick={() => start(() => skipOnboarding())}>
                Passer
              </button>
            )}
            <button className="btn-primary" onClick={() => setStep(step + 1)}>
              Continuer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
