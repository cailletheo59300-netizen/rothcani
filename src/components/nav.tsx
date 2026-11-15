"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Boxes, Plus, Receipt, Package, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/lots", label: "Lots", icon: Package },
  { href: "/ventes", label: "Ventes", icon: Receipt },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

async function signOut() {
  await createClient().auth.signOut();
  window.location.href = "/login";
}

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-8 w-8" />
        <span className="text-lg font-semibold tracking-tight">Revento</span>
      </Link>
      <Link href="/ajout" className="btn-primary mb-4">
        <Plus size={16} /> Ajouter des articles
      </Link>
      <nav className="flex flex-col gap-0.5">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
              active(path, href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-border px-2 pt-4">
        <p className="truncate text-xs text-muted">{email}</p>
        <button onClick={signOut} className="mt-2 flex items-center gap-2 text-xs text-muted hover:text-text">
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
    </aside>
  );
}

const MOBILE = [LINKS[0], LINKS[1], { href: "/ajout", label: "Ajouter", icon: Plus }, LINKS[3], LINKS[4]];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {MOBILE.map(({ href, label, icon: Icon }) =>
          href === "/ajout" ? (
            <Link key={href} href={href} className="flex flex-col items-center py-2" aria-label={label}>
              <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg">
                <Icon size={22} />
              </span>
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(path, href) ? "text-accent" : "text-muted"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
