import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { SortableExperiences } from "./sortable-experiences";

export default async function ExperiencePage() {
  const { supabase } = await requireAdmin();
  const { data: items } = await supabase.from("experiences").select("*").order("sort_order");

  return (
    <>
      <PageHeader
        title="Experiência"
        description="Linha do tempo na seção Sobre. Arraste pelo ⠿ para ordenar; clique para editar."
      />
      <SortableExperiences items={items ?? []} />
    </>
  );
}
