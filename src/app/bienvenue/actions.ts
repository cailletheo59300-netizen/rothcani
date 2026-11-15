"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

export type OnboardingData = {
  displayName: string;
  accounts: string[];
  packagingFee: number;
  shippingFee: number;
  locations: string[];
  next: "lot" | "article" | "import" | "accueil";
};

const NEXT_URL = { lot: "/lots/nouveau", article: "/ajout", import: "/reglages#import", accueil: "/" } as const;
const clean = (list: string[], max: number) => [...new Set(list.map((s) => s.trim()).filter(Boolean))].slice(0, max);

export async function completeOnboarding(d: OnboardingData) {
  const { supabase, user } = await requireUser();

  const accounts = clean(d.accounts, 10);
  const { data: existing } = await supabase.from("sales_accounts").select("id").order("created_at");
  if (accounts.length) {
    // Le premier compte (créé à l'inscription) est renommé, les autres sont ajoutés.
    if (existing?.[0]) await supabase.from("sales_accounts").update({ name: accounts[0] }).eq("id", existing[0].id);
    const extra = accounts.slice(existing?.length ? 1 : 0).map((name) => ({ name }));
    if (extra.length) await supabase.from("sales_accounts").insert(extra);
  }

  const locations = clean(d.locations, 50);
  if (locations.length) {
    const { data: have } = await supabase.from("locations").select("name");
    const known = new Set((have ?? []).map((l) => l.name.toLowerCase()));
    const toAdd = locations.filter((n) => !known.has(n.toLowerCase())).map((name) => ({ name }));
    if (toAdd.length) await supabase.from("locations").insert(toAdd);
  }

  const fee = (n: number) => (Number.isFinite(n) && n >= 0 ? Math.min(n, 100) : 0);
  await supabase
    .from("profiles")
    .update({
      display_name: d.displayName.trim() || null,
      default_packaging_fee: fee(d.packagingFee),
      default_shipping_fee: fee(d.shippingFee),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect(NEXT_URL[d.next] ?? "/");
}

export async function skipOnboarding() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function hideChecklist() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ checklist_hidden: true }).eq("id", user.id);
  revalidatePath("/");
}
