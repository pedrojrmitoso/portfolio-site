import { requireAdmin } from "@/lib/admin/auth";
import { tr } from "@/lib/i18n-text";
import { PageHeader } from "@/components/admin/page-header";
import { SortableProjects } from "./sortable-projects";

export default async function ProjectsPage() {
  const { supabase } = await requireAdmin();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, title, summary, thumbnail_url, featured, published, sort_order")
    .order("sort_order");

  return (
    <>
      <PageHeader
        title="Projetos"
        description="O 1º projeto em destaque vira o card largo. Arraste pelo ⠿ para ordenar; clique para editar."
      />
      <SortableProjects
        projects={(projects ?? []).map((p) => ({
          id: p.id,
          sort_order: p.sort_order,
          title: tr(p.title, "pt") || p.slug,
          summary: tr(p.summary, "pt"),
          thumbnail: p.thumbnail_url,
          featured: p.featured,
          published: p.published,
        }))}
      />
    </>
  );
}
