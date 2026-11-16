import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { SortableTechs } from "./sortable-techs";

export default async function TechnologiesPage() {
  const { supabase } = await requireAdmin();
  const { data: techs } = await supabase.from("technologies").select("*").order("sort_order");

  return (
    <>
      <PageHeader
        title="Tecnologias"
        description="Aparecem na seção Stack e nos cards de projeto. Arraste pelo ⠿ para ordenar; clique para editar."
      />
      <SortableTechs techs={techs ?? []} />
    </>
  );
}
