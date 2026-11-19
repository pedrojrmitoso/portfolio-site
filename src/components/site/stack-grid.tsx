"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { TechIcon, techIcons } from "@/lib/tech-icons";
import type { Dictionary } from "@/i18n/get-dictionary";

export type StackItem = {
  id: string;
  name: string;
  icon: string | null;
  icon_url: string | null;
  color: string | null;
  description: string;
  projects: string[];
};

export type StackGroup = { id: string; label: string; items: StackItem[] };

type Labels = Dictionary["stack"];

export function StackGrid({ groups, labels }: { groups: StackGroup[]; labels: Labels }) {
  const [open, setOpen] = useState<{ item: StackItem; category: string } | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div
            key={g.id}
            className="reveal rounded-2xl border border-line bg-surface/60 p-5 transition-colors hover:border-accent/50"
          >
            <h3 className="mb-4 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{g.label}</h3>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpen({ item: t, category: g.label })}
                    aria-label={`${labels.details} ${t.name}`}
                    aria-haspopup="dialog"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_8px_24px_-12px_var(--glow)]"
                  >
                    <TechIcon
                      icon={t.icon}
                      iconUrl={t.icon_url}
                      color={t.color}
                      name={t.name}
                      className="size-[18px]"
                    />
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <TechDialog data={open} onClose={() => setOpen(null)} labels={labels} />
    </>
  );
}

function TechDialog({
  data,
  onClose,
  labels,
}: {
  data: { item: StackItem; category: string } | null;
  onClose: () => void;
  labels: Labels;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (data && !d.open) d.showModal();
    else if (!data && d.open) d.close();
  }, [data]);

  const item = data?.item;
  const brand =
    (item && (item.color || (item.icon ? techIcons[item.icon]?.color : undefined))) || "var(--accent)";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="tech-dialog-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {item && data && (
        <div className="relative" style={{ "--brand": brand } as CSSProperties}>
          {/* brilho na cor da marca */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_30%_0%,color-mix(in_srgb,var(--brand)_28%,transparent),transparent)]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" />
          </button>

          <div className="relative p-6 pt-7">
            <div className="flex items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line bg-bg/70 shadow-[0_12px_32px_-14px_var(--brand)]">
                <TechIcon
                  icon={item.icon}
                  iconUrl={item.icon_url}
                  color={item.color}
                  name={item.name}
                  className="size-9"
                />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{data.category}</p>
                <h3
                  id="tech-dialog-title"
                  className="mt-1 font-display text-2xl font-semibold tracking-tight"
                >
                  {item.name}
                </h3>
              </div>
            </div>

            <p className={`mt-6 leading-relaxed ${item.description ? "" : "text-muted"}`}>
              {item.description || labels.empty}
            </p>

            {item.projects.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
                  {labels.used_in}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {item.projects.map((title) => (
                    <li key={title}>
                      <a
                        href="#projects"
                        onClick={onClose}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-3 text-sm transition-colors hover:border-accent hover:text-accent"
                      >
                        {title}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
