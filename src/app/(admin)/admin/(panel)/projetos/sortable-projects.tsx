"use client";

import { EyeOff, Star } from "lucide-react";
import { reorderProjects } from "../../actions";
import { Badge, RowText, SortableList } from "@/components/admin/sortable-list";

export type ProjectRow = {
  id: string;
  sort_order: number;
  title: string;
  summary: string;
  thumbnail: string | null;
  featured: boolean;
  published: boolean;
};

function Summary({ project }: { project: ProjectRow }) {
  return (
    <>
      <span
        className={`aspect-video w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2 sm:w-20 ${
          project.published ? "" : "opacity-50 grayscale"
        }`}
      >
        {project.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail} alt="" className="size-full object-cover" />
        )}
      </span>
      <RowText title={project.title} subtitle={project.summary || "Sem resumo"} />
      <span className="flex shrink-0 items-center gap-1.5">
        {project.featured && (
          <Badge>
            <Star className="size-3 fill-accent-2 text-accent-2" aria-hidden />
            <span className="hidden sm:inline">destaque</span>
            <span className="sr-only sm:hidden">Destaque</span>
          </Badge>
        )}
        {!project.published && (
          <Badge>
            <EyeOff className="size-3" aria-hidden />
            <span className="hidden sm:inline">rascunho</span>
            <span className="sr-only sm:hidden">Rascunho</span>
          </Badge>
        )}
      </span>
    </>
  );
}

export function SortableProjects({ projects }: { projects: ProjectRow[] }) {
  return (
    <SortableList
      items={projects}
      reorder={reorderProjects}
      noun={{ one: "projeto", many: "projetos", add: "Novo projeto", empty: "Nenhum projeto ainda." }}
      itemLabel={(p) => p.title}
      renderSummary={(p) => <Summary project={p} />}
      getHref={(p) => `/admin/projetos/${p.id}`}
      addHref="/admin/projetos/novo"
    />
  );
}
