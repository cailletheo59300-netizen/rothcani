"use client";

import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn-primary", confirmText }: { children: React.ReactNode; className?: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
