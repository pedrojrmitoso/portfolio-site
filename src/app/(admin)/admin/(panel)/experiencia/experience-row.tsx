"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { deleteExperience, saveExperience } from "../../actions";
import { EditorForm } from "@/components/admin/editor-form";
import type { EditorProps } from "@/components/admin/sortable-list";
import { Field, inputCls, LocalizedField } from "@/components/admin/ui";

/** Formulário de uma experiência. Montado só quando aberto: fechar descarta edições não salvas. */
export function ExperienceEditor({
  item,
  nextOrder,
  onDone,
  onCancel,
}: { item?: Tables<"experiences">; nextOrder?: number } & EditorProps) {
  return (
    <EditorForm
      id={item?.id}
      save={saveExperience}
      remove={deleteExperience}
      confirmRemove={`Excluir a experiência em ${item?.company}?`}
      submitLabel={item ? "Salvar alterações" : "Adicionar experiência"}
      onDone={onDone}
      onCancel={onCancel}
    >
      {!item && <input type="hidden" name="sort_order" value={nextOrder ?? 0} />}

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Empresa">
            <input
              name="company"
              defaultValue={item?.company ?? ""}
              required
              autoFocus={!item}
              className={inputCls}
            />
          </Field>
          <Field label="Início">
            <input
              name="start_date"
              type="date"
              defaultValue={item?.start_date ?? ""}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Fim" hint="Vazio = cargo atual">
            <input name="end_date" type="date" defaultValue={item?.end_date ?? ""} className={inputCls} />
          </Field>
        </div>
        <LocalizedField name="role" label="Cargo" defaultValue={item?.role} />
        <LocalizedField name="description" label="Resumo (1 linha)" defaultValue={item?.description} />
      </div>
    </EditorForm>
  );
}
