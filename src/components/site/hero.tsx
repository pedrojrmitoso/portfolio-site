import Image from "next/image";
import { ArrowRight, Download, MapPin } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Portfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { resumeHref } from "@/lib/resume";
import { SocialIcon, socialPlatforms } from "@/lib/social-icons";

export function Hero({ data, dict, locale }: { data: Portfolio; dict: Dictionary; locale: Locale }) {
  const { profile, links, stats } = data;
  const name = profile?.full_name || "—";
  const role = tr(profile?.role, locale);
  const resume = resumeHref(tr(profile?.resume_url, locale), locale);
  const available = profile?.available ?? false;

  const metrics = [
    { value: stats.projects, label: dict.stats.projects },
    { value: stats.technologies, label: dict.stats.technologies },
    ...(stats.years ? [{ value: `${stats.years}+`, label: dict.stats.years }] : []),
  ];

  return (
    <section
      id="top"
      className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 sm:py-16 lg:min-h-[min(46rem,calc(100dvh-3.5rem))] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16"
    >
      <div>
        <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
          <span className={`size-1.5 rounded-full ${available ? "animate-pulse bg-accent-2" : "bg-muted"}`} />
          {available ? dict.hero.available : dict.hero.unavailable}
        </p>

        <h1
          className="rise mt-6 font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-balance"
          style={{ animationDelay: "60ms" }}
        >
          {name}
        </h1>

        {role && (
          <p className="rise mt-5 max-w-xl text-lg text-muted sm:text-xl" style={{ animationDelay: "120ms" }}>
            {role}
          </p>
        )}

        {profile?.location && (
          <p
            className="rise mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted"
            style={{ animationDelay: "160ms" }}
          >
            <MapPin className="size-3.5 text-accent" aria-hidden />
            {profile.location}
          </p>
        )}

        <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "200ms" }}>
          {resume && (
            <a
              href={resume}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-accent-solid px-6 text-base font-medium text-white shadow-[0_12px_32px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5"
            >
              <Download
                className="size-[18px] transition-transform group-hover:translate-y-0.5"
                aria-hidden
              />
              {dict.hero.cta_resume}
              <span className="rounded-full bg-white/20 px-2 py-0.5 font-mono text-[11px]">PDF</span>
            </a>
          )}
          <a
            href="#projects"
            className={`group inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-base font-medium transition-[transform,border-color] ${
              resume
                ? "border border-line bg-surface/60 hover:border-accent"
                : "bg-accent-solid text-white shadow-[0_12px_32px_-10px_var(--accent)] hover:-translate-y-0.5"
            }`}
          >
            {dict.hero.cta_projects}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>

          <ul className="-ml-2.5 flex w-full items-center gap-1 sm:ml-1 sm:w-auto">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target={l.platform === "email" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={l.label || socialPlatforms[l.platform]?.label || l.platform}
                  className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  <SocialIcon platform={l.platform} className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Painel "instrumento": foto + métricas + sparkline */}
      <div className="rise relative" style={{ animationDelay: "260ms" }}>
        <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-2xl lg:-inset-6" />
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/80 shadow-2xl shadow-black/10 backdrop-blur">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="ml-3 font-mono text-[11px] text-muted">profile.json</span>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={name}
                  fill
                  sizes="64px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="grid size-full place-items-center font-display text-2xl font-semibold text-accent">
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
            </div>
            <div className="min-w-0 font-mono text-xs leading-relaxed">
              <p className="truncate">
                <span className="text-accent">name</span>: <span className="text-fg">&quot;{name}&quot;</span>
              </p>
              {role && (
                <p className="truncate text-muted">
                  <span className="text-accent">role</span>: &quot;{role}&quot;
                </p>
              )}
            </div>
          </div>

          <svg
            viewBox="0 0 300 80"
            className="hidden h-20 w-full sm:block"
            aria-hidden
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity=".35" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 70 L30 62 L60 66 L90 50 L120 54 L150 38 L180 42 L210 26 L240 30 L270 14 L300 8 L300 80 L0 80 Z"
              fill="url(#spark-fill)"
            />
            <path
              className="spark-line"
              pathLength={1}
              d="M0 70 L30 62 L60 66 L90 50 L120 54 L150 38 L180 42 L210 26 L240 30 L270 14 L300 8"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <dl className="grid grid-cols-3 divide-x divide-line border-t border-line">
            {metrics.map((m) => (
              <div key={m.label} className="px-4 py-4">
                <dt className="sr-only">{m.label}</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{m.value}</dd>
                <dd className="mt-0.5 text-[11px] leading-tight text-muted">{m.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
