import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireUser } from "@/lib/supabase/server";
import { euro, ref } from "@/lib/format";
import { PrintButton } from "./print-button";

type Row = { id: string; ref_number: number; title: string; size: string | null; brand: string | null; listed_price: number | null };

export default async function EtiquettesPage({ searchParams }: { searchParams: Promise<{ ids?: string; lot?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();

  let q = supabase.from("items").select("id,ref_number,title,size,brand,listed_price").order("ref_number").limit(500);
  const ids = (sp.ids ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/.test(s));
  if (ids.length) q = q.in("id", ids);
  else if (sp.lot) q = q.eq("lot_id", sp.lot);
  else q = q.in("status", ["arrivage", "tri", "preparation", "photos", "pret", "en_ligne"]);
  const { data } = await q;
  const items = (data ?? []) as Row[];

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const qrs = await Promise.all(
    items.map((i) => QRCode.toString(`${origin}/stock/${i.id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" })),
  );

  return (
    <main className="min-h-dvh bg-white text-black">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
        <div>
          <Link href="/stock" className="text-xs text-neutral-500 hover:underline">← Retour au stock</Link>
          <h1 className="text-xl font-semibold">Étiquettes ({items.length})</h1>
          <p className="text-sm text-neutral-500">
            Planche A4, 3 × 8 étiquettes (70 × 35 mm). Scannez le QR code avec l&apos;appareil photo du téléphone pour ouvrir la fiche.
          </p>
        </div>
        <PrintButton />
      </div>

      {items.length === 0 ? (
        <p className="px-4 text-sm text-neutral-500">Aucun article à étiqueter.</p>
      ) : (
        <div className="mx-auto grid w-[210mm] max-w-full grid-cols-3 print:w-full print:max-w-none">
          {items.map((i, n) => (
            <div
              key={i.id}
              className="flex h-[35mm] items-center gap-[3mm] overflow-hidden border border-dashed border-neutral-300 p-[3mm] print:border-neutral-200"
              style={{ breakInside: "avoid" }}
            >
              <div className="h-[27mm] w-[27mm] shrink-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrs[n] }} />
              <div className="min-w-0 leading-tight">
                <p className="font-mono text-[15pt] font-bold">{ref(i.ref_number)}</p>
                <p className="line-clamp-2 text-[8pt]">{i.title}</p>
                <p className="mt-[1mm] text-[8pt] text-neutral-600">
                  {[i.brand, i.size].filter(Boolean).join(" · ")}
                </p>
                {i.listed_price != null && <p className="text-[10pt] font-semibold">{euro(i.listed_price)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
