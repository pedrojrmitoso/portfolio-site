"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download, Menu, X } from "lucide-react";

export function MobileMenu({
  links,
  resume,
  labels,
  controls,
}: {
  links: { href: string; label: string }[];
  resume: string | null;
  labels: { menu: string; close: string; resume: string };
  /** Idioma + tema (só aparecem aqui em telas pequenas) */
  controls?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.menu}
        className="grid size-11 place-items-center rounded-full border border-line bg-surface/60"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-14 z-50 h-[calc(100dvh-3.5rem)] overflow-y-auto bg-bg px-6 pt-6 pb-10"
        >
          {controls}
          <nav className="mt-4 flex flex-col">
            {links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rise flex items-baseline gap-4 border-b border-line py-5 font-display text-3xl font-semibold tracking-tight"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                {l.label}
              </a>
            ))}
          </nav>
          {resume && (
            <a
              href={resume}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-solid px-5 py-3 text-sm font-medium text-white"
            >
              <Download className="size-4" aria-hidden />
              {labels.resume}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
