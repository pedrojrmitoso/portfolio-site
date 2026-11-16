import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Portfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { Section } from "./section";

function year(date: string) {
  return date.slice(0, 4);
}

export function About({ data, dict, locale }: { data: Portfolio; dict: Dictionary; locale: Locale }) {
  const bio = tr(data.profile?.bio, locale);

  return (
    <Section id="about" index="01" label={dict.sections.about}>
      <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <p className="reveal font-display text-2xl leading-snug tracking-tight text-balance sm:text-3xl">
          {bio}
        </p>

        {data.experiences.length > 0 && (
          <div className="reveal">
            <h3 className="mb-5 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              {dict.sections.experience}
            </h3>
            <ol className="relative space-y-6 border-l border-line pl-6">
              {data.experiences.map((e, i) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-bg ${
                      i === 0 && !e.end_date ? "bg-accent-2" : "bg-line"
                    }`}
                  />
                  <p className="font-mono text-[11px] text-muted">
                    {year(e.start_date)} — {e.end_date ? year(e.end_date) : dict.experience.present}
                  </p>
                  <p className="mt-1 font-medium">
                    {tr(e.role, locale)} <span className="text-muted">· {e.company}</span>
                  </p>
                  {tr(e.description, locale) && (
                    <p className="mt-1 text-sm text-muted">{tr(e.description, locale)}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Section>
  );
}
