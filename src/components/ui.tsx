import Link from "next/link";
import { STATUS_META } from "@/lib/format";
import type { ItemStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ItemStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${m.tone}`}>
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
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-xs text-muted hover:text-text">
            ← {back.label}
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
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

export function Thumb({ url, alt }: { url?: string | null; alt: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[10px] text-muted">
      photo
    </div>
  );
}
