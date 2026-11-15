import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/data";
import { Wizard } from "./wizard";

export default async function BienvenuePage() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(supabase, user.id);
  if (profile.onboarded_at) redirect("/");
  const { data: accounts } = await supabase.from("sales_accounts").select("name").order("created_at");
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-10 md:items-center">
      <Wizard
        initialName={profile.display_name ?? ""}
        initialAccounts={(accounts ?? []).map((a) => a.name)}
        initialPackaging={Number(profile.default_packaging_fee)}
        initialShipping={Number(profile.default_shipping_fee)}
      />
    </main>
  );
}
