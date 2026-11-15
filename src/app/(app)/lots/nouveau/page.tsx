import { requireUser } from "@/lib/supabase/server";
import { loadRefs } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { LotFields } from "@/components/lot-fields";
import { Submit } from "@/components/submit";
import { createLot } from "../../actions";

export default async function NouveauLotPage() {
  const { supabase } = await requireUser();
  const refs = await loadRefs(supabase);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        back={{ href: "/lots", label: "Lots" }}
        title="Nouveau lot"
        subtitle="Le prix total est réparti automatiquement sur les articles du lot."
      />
      <form action={createLot} className="card space-y-5 p-5">
        <LotFields suppliers={refs.suppliers} withCount />
        <Submit className="btn-primary h-11 w-full">Créer le lot</Submit>
      </form>
    </div>
  );
}
