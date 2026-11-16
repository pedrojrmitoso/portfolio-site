import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Portfolio } from "@/lib/data";
import { SocialIcon, socialPlatforms } from "@/lib/social-icons";
import { ContactForm } from "./contact-form";
import { Section } from "./section";

export function Contact({ data, dict, locale }: { data: Portfolio; dict: Dictionary; locale: Locale }) {
  return (
    <Section id="contact" index="04" label={dict.sections.contact}>
      <div className="reveal relative overflow-hidden rounded-3xl border border-line bg-surface/70 p-5 sm:p-12">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 size-72 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]"
        />
        <h3 className="relative font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {dict.contact.title}
        </h3>
        <p className="relative mt-3 text-muted">{dict.contact.subtitle}</p>

        <div className="relative mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
          <ContactForm dict={dict.contact.form} locale={locale} />

          {data.links.length > 0 && (
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
                {dict.contact.form.or_direct}
              </p>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
                {data.links.map((l) => {
                  const label = l.label || socialPlatforms[l.platform]?.label || l.platform;
                  const handle = l.url
                    .replace(/^mailto:/, "")
                    .replace(/^https?:\/\/(www\.)?/, "")
                    .replace(/\/$/, "");
                  return (
                    <li key={l.id}>
                      <a
                        href={l.url}
                        target={l.platform === "email" ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-4 transition-colors hover:border-accent"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg transition-colors group-hover:bg-accent-solid group-hover:text-white">
                          <SocialIcon platform={l.platform} className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block truncate font-mono text-[11px] text-muted">{handle}</span>
                        </span>
                        <ArrowUpRight
                          className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                          aria-hidden
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
