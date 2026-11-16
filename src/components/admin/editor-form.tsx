"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { ActionState } from "@/app/(admin)/admin/actions";
import { DeleteButton, Status, SubmitButton } from "./ui";
import { btn } from "./styles";

/**
 * Formulário de um item de lista editável. Salvar fica desativado até haver mudança;
 * em sucesso chama `onDone` (o pai fecha o editor e mostra a mensagem). Esc cancela.
 */
export function EditorForm({
  id,
  save,
  remove,
  confirmRemove = "Excluir este item?",
  submitLabel,
  onDone,
  onCancel,
  children,
}: {
  /** Ausente = item novo. */
  id?: string;
  save: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  remove?: (id: string) => Promise<ActionState>;
  confirmRemove?: string;
  submitLabel: string;
  onDone: (state: ActionState) => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(!id);
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await save(prev, fd);
    if (result?.ok) onDone(result);
    return result;
  }, null);

  return (
    <form
      action={action}
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
      onKeyDown={(e) => {
        // Esc num <select> aberto só fecha a lista de opções
        if (e.key === "Escape" && !(e.target instanceof HTMLSelectElement)) onCancel();
      }}
      className="p-4 pt-3 sm:px-5"
    >
      {id && <input type="hidden" name="id" value={id} />}
      {children}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {id && remove && (
          <DeleteButton
            size="sm"
            confirmText={confirmRemove}
            onDelete={async () => void onDone(await remove(id))}
          />
        )}
        {state && !state.ok && <Status state={state} />}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onCancel} className={btn("ghost", "sm")}>
            Cancelar
          </button>
          <SubmitButton size="sm" disabled={!dirty}>
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
