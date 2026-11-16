import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Portfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { techCategories } from "@/lib/tech-icons";
import { Section } from "./section";
import { StackGrid, type StackGroup } from "./stack-grid";

export function Stack({ data, dict, locale }: { data: Portfolio; dict: Dictionary; locale: Locale }) {
  const visible = data.technologies.filter((t) => t.show_in_stack);
  const known = new Set<string>(techCategories);

  // Projetos publicados que usam cada tecnologia (montado a partir dos projetos)
  const usedIn = new Map<string, string[]>();
  for (const p of data.projects) {
    for (const t of p.technologies) {
      usedIn.set(t.id, [...(usedIn.get(t.id) ?? []), tr(p.title, locale)]);
    }
  }

  const groups: StackGroup[] = [...techCategories, "other"]
    .map((cat) => ({
      id: cat,
      label: dict.categories[cat as keyof Dictionary["categories"]] ?? "—",
      items: visible
        .filter((t) => (known.has(t.category) ? t.category : "other") === cat)
        .map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          color: t.color,
          description: tr(t.description, locale),
          projects: usedIn.get(t.id) ?? [],
        })),
    }))
    .filter((g) => g.items.length);

  return (
    <Section id="stack" index="02" label={dict.sections.stack}>
      <StackGrid groups={groups} labels={dict.stack} />
    </Section>
  );
}
