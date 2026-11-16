import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { SortableLinks } from "./sortable-links";

export default async function LinksPage() {
  const { supabase } = await requireAdmin();
  const { data: links } = await supabase.from("social_links").select("*").order("sort_order");

  return (
    <>
      <PageHeader
        title="Links"
        description="Aparecem no hero e em Contato. Arraste pelo ⠿ para ordenar; clique para editar."
      />
      <SortableLinks links={links ?? []} />
    </>
  );
}
