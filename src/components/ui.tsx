import Link from "next/link";
import { ChevronLeft, ImageIcon } from "lucide-react";
import { PHASE_DOT, STATUS_META } from "@/lib/format";
import type { ItemStatus } from "@/lib/types";

/** Statut = un point de couleur (l'étape) + un mot. Sobre et lisible partout. */
export function StatusBadge({ status }: { status: ItemStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${PHASE_DOT[m.phase]}`} />
      {m.label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="-ml-1 mb-2 inline-flex items-center gap-0.5 text-sm text-muted hover:text-text">
          <ChevronLeft size={16} /> {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}

export function Stat({ label, value, hint, tone, className }: { label: string; value: string; hint?: string; tone?: "good" | "bad"; className?: string }) {
  return (
    <div className={`card p-4 sm:p-5 ${className ?? ""}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px] ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="text-base font-medium">{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Thumb({ url, alt, size = "md" }: { url?: string | null; alt: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={`${cls} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted/60`}>
      <ImageIcon size={16} />
    </div>
  );
}
