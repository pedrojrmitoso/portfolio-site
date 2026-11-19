import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";

export const PORTFOLIO_TAG = "portfolio";

export type Technology = Pick<
  Tables<"technologies">,
  "id" | "name" | "icon" | "icon_url" | "color" | "category" | "show_in_stack" | "sort_order"
> & { description?: Tables<"technologies">["description"] };

export type Project = Tables<"projects"> & {
  images: Pick<Tables<"project_images">, "id" | "url" | "alt" | "sort_order">[];
  technologies: Technology[];
};

export type Portfolio = {
  profile: Tables<"profile"> | null;
  links: Tables<"social_links">[];
  technologies: Technology[];
  projects: Project[];
  experiences: Tables<"experiences">[];
  stats: { projects: number; technologies: number; years: number; currentYear: number };
};

/**
 * Todo o conteúdo público em uma ida ao banco. Cacheado e invalidado
 * pelo painel via updateTag(PORTFOLIO_TAG).
 */
export async function getPortfolio(): Promise<Portfolio> {
  "use cache";
  cacheLife("hours");
  cacheTag(PORTFOLIO_TAG);

  const db = createPublicClient();
  const techCols = "id,name,icon,icon_url,color,category,show_in_stack,sort_order,description";

  const [profile, links, technologies, projects, experiences] = await Promise.all([
    db.from("profile").select("*").eq("id", 1).maybeSingle(),
    db.from("social_links").select("*").eq("visible", true).order("sort_order"),
    db.from("technologies").select(techCols).order("sort_order"),
    db
      .from("projects")
      .select(
        "*, images:project_images(id,url,alt,sort_order), technologies(id,name,icon,icon_url,color,category,show_in_stack,sort_order)",
      )
      .eq("published", true)
      .order("sort_order"),
    db.from("experiences").select("*").order("sort_order"),
  ]);

  const firstError = [profile, links, technologies, projects, experiences].find((r) => r.error)?.error;
  if (firstError) throw new Error(`Supabase: ${firstError.message}`);

  const now = new Date();
  const starts = (experiences.data ?? []).map((e) => new Date(e.start_date).getTime());
  const years = starts.length
    ? Math.max(1, Math.floor((now.getTime() - Math.min(...starts)) / (365.25 * 864e5)))
    : 0;

  return {
    stats: {
      projects: projects.data?.length ?? 0,
      technologies: technologies.data?.length ?? 0,
      years,
      currentYear: now.getFullYear(),
    },
    profile: profile.data,
    links: links.data ?? [],
    technologies: technologies.data ?? [],
    projects: (projects.data ?? []).map((p) => ({
      ...p,
      images: [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      technologies: [...(p.technologies ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    })),
    experiences: experiences.data ?? [],
  };
}
