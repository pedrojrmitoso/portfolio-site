import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { tr } from "@/lib/i18n-text";
import { ProjectForm } from "./project-form";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProjectEditPage({ params, searchParams }: PageProps<"/admin/projetos/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const isNew = id === "novo";
  if (!isNew && !UUID.test(id)) notFound();

  const [{ data: technologies }, projectRes, { data: last }] = await Promise.all([
    supabase.from("technologies").select("id, name, icon, icon_url, color, category").order("sort_order"),
    isNew
      ? Promise.resolve({ data: null })
      : supabase
          .from("projects")
          .select("*, project_images(url, alt, sort_order), project_technologies(technology_id)")
          .eq("id", id)
          .maybeSingle(),
    supabase
      .from("projects")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const project = projectRes.data;
  if (!isNew && !project) notFound();

  return (
    <>
      <PageHeader
        back={{ href: "/admin/projetos", label: "Projetos" }}
        title={isNew ? "Novo projeto" : tr(project!.title, "pt") || project!.slug}
      />
      <ProjectForm
        key={project?.id ?? "novo"}
        project={project}
        technologies={technologies ?? []}
        nextOrder={(last?.sort_order ?? 0) + 1}
        justSaved={sp.saved === "1"}
      />
    </>
  );
}
