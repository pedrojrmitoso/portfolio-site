"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { deleteTechnology, saveTechnology } from "../../actions";
import { EditorForm } from "@/components/admin/editor-form";
import type { EditorProps } from "@/components/admin/sortable-list";
import { Field, inputCls, LocalizedField, Toggle } from "@/components/admin/ui";
import { TechIcon, techCategories, techIcons } from "@/lib/tech-icons";

export const categoryLabels: Record<string, string> = {
  languages: "Linguagens",
  data: "Engenharia de dados",
  bi: "BI & Visualização",
  ai: "IA & ML",
  cloud: "Cloud & Bancos",
  tools: "Ferramentas",
};

const catalog = Object.entries(techIcons).sort((a, b) => a[1].label.localeCompare(b[1].label));

/**
 * Formulário de uma tecnologia. Só é montado quando o item está aberto,
 * então fechar e reabrir descarta edições não salvas.
 */
export function TechEditor({
  tech,
  nextOrder,
  onDone,
  onCancel,
}: {
  tech?: Tables<"technologies">;
  nextOrder?: number;
} & EditorProps) {
  const [icon, setIcon] = useState(tech?.icon ?? "");
  const [name, setName] = useState(tech?.name ?? "");
  const [category, setCategory] = useState(tech?.category ?? "tools");
  const [color, setColor] = useState(tech?.color ?? "");

  return (
    <EditorForm
      id={tech?.id}
      save={saveTechnology}
      remove={deleteTechnology}
      confirmRemove={`Excluir "${tech?.name}"? Ela sai também dos projetos que a usam.`}
      submitLabel={tech ? "Salvar alterações" : "Adicionar tecnologia"}
      onDone={onDone}
      onCancel={onCancel}
    >
      {!tech && <input type="hidden" name="sort_order" value={nextOrder ?? 0} />}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="grid size-10 place-items-center rounded-lg border border-line bg-bg" aria-hidden>
          <TechIcon icon={icon || null} color={color || null} name={name || "?"} className="size-5" />
        </div>
        <Field label="Logo (catálogo)">
          <select
            name="icon"
            value={icon}
            onChange={(e) => {
              const key = e.target.value;
              setIcon(key);
              const def = techIcons[key];
              if (def && !tech) {
                if (!name) setName(def.label);
                setCategory(def.category);
              }
            }}
            className={inputCls}
          >
            <option value="">— sem logo (inicial) —</option>
            {catalog.map(([key, def]) => (
              <option key={key} value={key}>
                {def.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome exibido" className="col-span-2 sm:col-span-1">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus={!tech}
            className={inputCls}
          />
        </Field>
        <Field label="Categoria" className="col-span-2 sm:col-span-1">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {techCategories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <LocalizedField
          name="description"
          label="Sobre a tecnologia (aparece ao clicar na Stack)"
          defaultValue={tech?.description}
          multiline
          rows={2}
          hint="1–2 frases: como você usa, há quanto tempo, um resultado. Os projetos que a usam aparecem sozinhos."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5">
        <Toggle
          name="show_in_stack"
          label="Mostrar na seção Stack"
          defaultChecked={tech?.show_in_stack ?? true}
        />
        <label className="inline-flex items-center gap-2 text-xs text-muted">
          Cor personalizada
          <span
            className="size-4 rounded-full border border-line"
            style={{ background: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "transparent" }}
            aria-hidden
          />
          <input
            name="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#RRGGBB"
            className={`${inputCls} w-28 py-1 font-mono text-xs`}
          />
        </label>
      </div>
    </EditorForm>
  );
}
