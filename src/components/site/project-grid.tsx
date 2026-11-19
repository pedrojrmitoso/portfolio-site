"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { TechIcon } from "@/lib/tech-icons";
import type { Dictionary } from "@/i18n/get-dictionary";

export type ProjectCardData = {
  id: string;
  title: string;
  summary: string;
  description: string;
  thumbnail: string | null;
  images: { url: string; alt: string }[];
  demo: string | null;
  repo: string | null;
  featured: boolean;
  techs: { id: string; name: string; icon: string | null; icon_url: string | null; color: string | null }[];
};

type Labels = Dictionary["projects"];

function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function TechList({ techs, max }: { techs: ProjectCardData["techs"]; max?: number }) {
  const shown = max ? techs.slice(0, max) : techs;
  const rest = techs.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((t) => (
        <li
          key={t.id}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg/60 px-2.5 py-1 text-xs"
        >
          <TechIcon icon={t.icon} iconUrl={t.icon_url} color={t.color} name={t.name} className="size-4" />
          {t.name}
        </li>
      ))}
      {rest > 0 && (
        <li className="rounded-md border border-line px-2 py-1 font-mono text-xs text-muted">+{rest}</li>
      )}
    </ul>
  );
}

function LinkButtons({ p, labels }: { p: ProjectCardData; labels: Labels }) {
  return (
    <div className="flex min-h-11 flex-wrap gap-2 sm:min-h-9">
      {p.demo && (
        <a
          href={p.demo}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-solid px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:min-h-9 sm:px-3.5 sm:text-xs"
        >
          {labels.demo}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      )}
      {p.repo && (
        <a
          href={p.repo}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-accent sm:min-h-9 sm:px-3.5 sm:text-xs"
        >
          <SiGithub className="size-3.5" aria-hidden />
          {labels.code}
        </a>
      )}
    </div>
  );
}

export function ProjectGrid({ items, labels }: { items: ProjectCardData[]; labels: Labels }) {
  const [open, setOpen] = useState<ProjectCardData | null>(null);

  return (
    <>
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => {
          const wide = i === 0 && p.featured;
          return (
            <li
              key={p.id}
              onMouseMove={spotlight}
              className={`reveal group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/70 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-accent/60 has-[:focus-visible]:border-accent ${
                wide ? "md:col-span-2 md:flex-row" : ""
              }`}
            >
              {/* luz que segue o mouse */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(420px circle at var(--mx) var(--my), var(--glow), transparent 60%)",
                }}
              />

              <button
                type="button"
                onClick={() => setOpen(p)}
                aria-label={`${labels.details}: ${p.title}`}
                className={`relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-2 focus-visible:outline-offset-[-3px] ${
                  wide ? "md:aspect-auto md:min-h-72 md:w-[58%]" : ""
                }`}
              >
                {p.thumbnail ? (
                  <Image
                    src={p.thumbnail}
                    alt=""
                    fill
                    sizes={
                      wide
                        ? "(min-width:1024px) 40vw, 100vw"
                        : "(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                    }
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-2 to-surface font-display text-6xl font-semibold text-accent/25"
                  >
                    {p.title.slice(0, 1)}
                  </span>
                )}
                {wide && (
                  <span className="absolute top-3 left-3 rounded-full bg-accent-2 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#04201c] uppercase">
                    {labels.featured}
                  </span>
                )}
                {p.images.length > 1 && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
                    <Images className="size-3" aria-hidden />
                    {p.images.length} {labels.photos}
                  </span>
                )}
              </button>

              <div className={`relative z-10 flex flex-1 flex-col gap-4 p-5 ${wide ? "md:p-7" : ""}`}>
                <div>
                  <h3
                    className={`font-display font-semibold tracking-tight ${wide ? "text-xl md:text-2xl" : "text-xl"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(p)}
                      className="-my-2 py-2 text-left hover:text-accent"
                    >
                      {p.title}
                    </button>
                  </h3>
                  {p.summary && <p className="mt-1.5 text-sm text-muted">{p.summary}</p>}
                </div>
                <TechList techs={p.techs} max={wide ? 6 : 4} />
                <div className="mt-auto pt-1">
                  <LinkButtons p={p} labels={labels} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ProjectDialog project={open} onClose={() => setOpen(null)} labels={labels} />
    </>
  );
}

function ProjectDialog({
  project,
  onClose,
  labels,
}: {
  project: ProjectCardData | null;
  onClose: () => void;
  labels: Labels;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (project && !d.open) d.showModal();
    else if (!project && d.open) d.close();
  }, [project]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(64rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {/* key: reinicia a galeria (foto 1) a cada projeto aberto */}
      {project && <DialogBody key={project.id} project={project} onClose={onClose} labels={labels} />}
    </dialog>
  );
}

function DialogBody({
  project,
  onClose,
  labels,
}: {
  project: ProjectCardData;
  onClose: () => void;
  labels: Labels;
}) {
  const [idx, setIdx] = useState(0);
  const images = project.images.length
    ? project.images
    : project.thumbnail
      ? [{ url: project.thumbnail, alt: project.title }]
      : [];

  const go = useCallback(
    (delta: number) => setIdx((i) => (i + delta + images.length) % images.length),
    [images.length],
  );

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="relative aspect-[16/9] w-full bg-surface-2">
        {images[idx] && (
          <Image
            key={images[idx].url}
            src={images[idx].url}
            alt={images[idx].alt}
            fill
            sizes="(min-width:1024px) 64rem, 100vw"
            className="object-cover"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"
        >
          <X className="size-4" />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={labels.prev}
              className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={labels.next}
              className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bg/80 px-2.5 py-1 font-mono text-[11px] backdrop-blur">
              {idx + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-line p-3">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`${i + 1} / ${images.length}`}
              aria-current={i === idx}
              className={`relative aspect-[16/9] w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === idx ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5 p-6">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{project.title}</h3>
          {project.summary && <p className="mt-1 text-muted">{project.summary}</p>}
        </div>
        {project.description && <p className="leading-relaxed">{project.description}</p>}
        <TechList techs={project.techs} />
        <LinkButtons p={project} labels={labels} />
      </div>
    </div>
  );
}
