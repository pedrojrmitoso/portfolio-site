import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Portfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { Section } from "./section";
import { ProjectGrid, type ProjectCardData } from "./project-grid";

export function Projects({ data, dict, locale }: { data: Portfolio; dict: Dictionary; locale: Locale }) {
  const items: ProjectCardData[] = data.projects.map((p) => {
    const title = tr(p.title, locale);
    return {
      id: p.id,
      title,
      summary: tr(p.summary, locale),
      description: tr(p.description, locale),
      thumbnail: p.thumbnail_url ?? p.images[0]?.url ?? null,
      images: p.images.map((img) => ({ url: img.url, alt: tr(img.alt, locale) || title })),
      demo: p.demo_url,
      repo: p.repo_url,
      featured: p.featured,
      techs: p.technologies.map((t) => ({ id: t.id, name: t.name, icon: t.icon, color: t.color })),
    };
  });

  return (
    <Section id="projects" index="03" label={dict.sections.projects}>
      {items.length ? (
        <ProjectGrid items={items} labels={dict.projects} />
      ) : (
        <p className="text-muted">{dict.projects.empty}</p>
      )}
    </Section>
  );
}
