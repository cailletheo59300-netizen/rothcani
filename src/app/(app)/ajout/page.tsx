import { requireUser } from "@/lib/supabase/server";
import { loadRefs } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { QuickAdd } from "./quick-add";

export default async function AjoutPage({ searchParams }: { searchParams: Promise<{ lot?: string }> }) {
  const { lot } = await searchParams;
  const { supabase } = await requireUser();
  const refs = await loadRefs(supabase);
  return (
    <>
      <PageHeader title="Ajouter des articles" subtitle="Photos, quelques infos, et au suivant. Le reste peut se compléter plus tard." />
      <QuickAdd {...refs} defaultLot={lot ?? ""} />
    </>
  );
}
