"use client";

import { EyeOff } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import { reorderLinks } from "../../actions";
import { Badge, RowText, SortableList } from "@/components/admin/sortable-list";
import { SocialIcon, socialPlatforms } from "@/lib/social-icons";
import { LinkEditor } from "./link-row";

type Link = Tables<"social_links">;

const title = (l: Link) => l.label || socialPlatforms[l.platform]?.label || l.platform;
/** URL legível: sem mailto:, protocolo, www. e barra final */
const display = (url: string) =>
  url
    .replace(/^mailto:/, "")
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "");

function Summary({ link }: { link: Link }) {
  return (
    <>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg ${
          link.visible ? "" : "opacity-50"
        }`}
      >
        <SocialIcon platform={link.platform} className="size-[18px]" />
      </span>
      <RowText title={title(link)} subtitle={display(link.url)} mono />
      {!link.visible && (
        <>
          <span className="hidden shrink-0 sm:flex">
            <Badge>
              <EyeOff className="size-3" aria-hidden /> oculto
            </Badge>
          </span>
          <EyeOff className="size-3.5 shrink-0 text-muted sm:hidden" aria-label="Oculto" />
        </>
      )}
    </>
  );
}

export function SortableLinks({ links }: { links: Link[] }) {
  return (
    <SortableList
      items={links}
      reorder={reorderLinks}
      noun={{ one: "link", many: "links", add: "Novo link", empty: "Nenhum link ainda." }}
      itemLabel={title}
      renderSummary={(l) => <Summary link={l} />}
      renderEditor={(l, props) => <LinkEditor link={l} {...props} />}
    />
  );
}
