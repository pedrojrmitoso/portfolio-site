"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { reorderExperiences } from "../../actions";
import { Badge, RowText, SortableList } from "@/components/admin/sortable-list";
import { tr } from "@/lib/i18n-text";
import { ExperienceEditor } from "./experience-row";

type Experience = Tables<"experiences">;

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
/** "jan. de 2022" -> "jan 2022" */
const fmt = (date: string) => monthYear.format(new Date(date)).replace(/\.? de /, " ");

function Summary({ item }: { item: Experience }) {
  const role = tr(item.role, "pt");
  return (
    <>
      <span className="hidden w-28 shrink-0 font-mono text-[11px] leading-tight text-muted sm:block">
        {fmt(item.start_date)}
        <br />
        {item.end_date ? fmt(item.end_date) : "atual"}
      </span>
      <RowText
        title={item.company}
        subtitle={
          <>
            {role || "Sem cargo"}
            <span className="font-mono sm:hidden">
              {" · "}
              {fmt(item.start_date)} – {item.end_date ? fmt(item.end_date) : "atual"}
            </span>
          </>
        }
      />
      {!item.end_date && (
        <span className="hidden shrink-0 sm:flex">
          <Badge>
            <span className="size-1.5 rounded-full bg-accent-2" aria-hidden /> atual
          </Badge>
        </span>
      )}
    </>
  );
}

export function SortableExperiences({ items }: { items: Experience[] }) {
  return (
    <SortableList
      items={items}
      reorder={reorderExperiences}
      noun={{
        one: "experiência",
        many: "experiências",
        add: "Nova experiência",
        empty: "Nenhuma experiência ainda.",
      }}
      itemLabel={(e) => e.company}
      renderSummary={(e) => <Summary item={e} />}
      renderEditor={(e, props) => <ExperienceEditor item={e} {...props} />}
    />
  );
}
