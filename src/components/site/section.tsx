import type { ReactNode } from "react";

export function Section({
  id,
  index,
  label,
  children,
  className = "",
}: {
  id: string;
  index: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-20 py-12 sm:py-20 ${className}`}>
      <div className="reveal mb-8 flex items-center gap-4">
        <span className="font-mono text-xs text-accent">{index}</span>
        <h2 id={`${id}-title`} className="font-mono text-xs tracking-[0.25em] text-muted uppercase">
          {label}
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
      </div>
      {children}
    </section>
  );
}
