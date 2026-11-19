"use client";

import { EyeOff } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import { reorderTechnologies } from "../../actions";
import { Badge, RowText, SortableList } from "@/components/admin/sortable-list";
import { TechIcon } from "@/lib/tech-icons";
import { categoryLabels, TechEditor } from "./tech-row";

type Tech = Tables<"technologies">;

const hasDescription = (d: unknown) =>
  !!d && typeof d === "object" && Object.values(d as Record<string, unknown>).some(Boolean);

function Summary({ tech }: { tech: Tech }) {
  return (
    <>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg ${
          tech.show_in_stack ? "" : "opacity-50 grayscale"
        }`}
      >
        <TechIcon
          icon={tech.icon}
          iconUrl={tech.icon_url}
          color={tech.color}
          name={tech.name}
          className="size-[18px]"
        />
      </span>
      <RowText title={tech.name} subtitle={categoryLabels[tech.category] ?? tech.category} />
      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {!hasDescription(tech.description) && <Badge dashed>sem descrição</Badge>}
        {!tech.show_in_stack && (
          <Badge>
            <EyeOff className="size-3" aria-hidden /> fora da Stack
          </Badge>
        )}
      </span>
      {!tech.show_in_stack && (
        <EyeOff className="size-3.5 shrink-0 text-muted sm:hidden" aria-label="Fora da Stack" />
      )}
    </>
  );
}

export function SortableTechs({ techs }: { techs: Tech[] }) {
  return (
    <SortableList
      items={techs}
      reorder={reorderTechnologies}
      noun={{
        one: "tecnologia",
        many: "tecnologias",
        add: "Nova tecnologia",
        empty: "Nenhuma tecnologia ainda.",
      }}
      itemLabel={(t) => t.name}
      renderSummary={(t) => <Summary tech={t} />}
      renderEditor={(t, props) => <TechEditor tech={t} {...props} />}
    />
  );
}
