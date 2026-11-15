"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ tone: "err", text: "E-mail ou mot de passe incorrect." });
      else {
        router.replace("/");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMsg({ tone: "err", text: error.message });
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setMsg({ tone: "ok", text: "Compte créé. Confirmez votre adresse via l'e-mail reçu, puis connectez-vous." });
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-10 w-10" />
          <div>
            <p className="text-xl font-semibold tracking-tight">Revento</p>
            <p className="text-sm text-muted">Votre stock et vos marges, au même endroit.</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-8 rounded-lg font-medium ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {m === "in" ? "Connexion" : "Créer un compte"}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label">E-mail</span>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Mot de passe</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {msg && <p className={`text-sm ${msg.tone === "err" ? "text-bad" : "text-good"}`}>{msg.text}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </main>
  );
}
