"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteLink, saveLink } from "../../actions";
import { EditorForm } from "@/components/admin/editor-form";
import type { EditorProps } from "@/components/admin/sortable-list";
import { Field, inputCls, Toggle } from "@/components/admin/ui";
import { SocialIcon, socialPlatforms } from "@/lib/social-icons";

/** Formulário de um link. Montado só quando aberto: fechar descarta edições não salvas. */
export function LinkEditor({
  link,
  nextOrder,
  onDone,
  onCancel,
}: { link?: Tables<"social_links">; nextOrder?: number } & EditorProps) {
  const [platform, setPlatform] = useState(link?.platform ?? "github");
  const isEmail = platform === "email";
  const isWhatsapp = platform === "whatsapp";

  return (
    <EditorForm
      id={link?.id}
      save={saveLink}
      remove={deleteLink}
      confirmRemove={`Excluir o link ${link?.label || socialPlatforms[link?.platform ?? ""]?.label || ""}?`}
      submitLabel={link ? "Salvar alterações" : "Adicionar link"}
      onDone={onDone}
      onCancel={onCancel}
    >
      {!link && <input type="hidden" name="sort_order" value={nextOrder ?? 0} />}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[auto_11rem_minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid size-10 place-items-center rounded-lg border border-line bg-bg" aria-hidden>
          <SocialIcon platform={platform} className="size-5" />
        </div>
        <Field label="Plataforma">
          <select
            name="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={inputCls}
          >
            {Object.entries(socialPlatforms).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={isEmail ? "E-mail" : isWhatsapp ? "Número ou link" : "URL"}
          className="col-span-2 sm:col-span-1"
        >
          <input
            name="url"
            type={isEmail ? "email" : isWhatsapp ? "tel" : "text"}
            inputMode={isEmail ? "email" : isWhatsapp ? "tel" : "url"}
            defaultValue={link?.url.replace(/^mailto:/, "") ?? ""}
            placeholder={isEmail ? "voce@exemplo.com" : isWhatsapp ? "+55 11 99999-9999" : "https://"}
            required
            autoFocus={!link}
            className={inputCls}
          />
        </Field>
        <Field label="Rótulo (opcional)" className="col-span-2 sm:col-span-1">
          <input
            name="label"
            defaultValue={link?.label ?? ""}
            placeholder={socialPlatforms[platform]?.label}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Toggle name="visible" label="Visível no site" defaultChecked={link?.visible ?? true} />
      </div>
    </EditorForm>
  );
}
