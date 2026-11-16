"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import type { ActionState } from "@/app/(admin)/admin/actions";
import { btn, inputCls } from "./styles";

export { inputCls };

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function SubmitButton({
  children = "Salvar",
  size = "md",
  disabled = false,
}: {
  children?: ReactNode;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={btn("primary", size)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Status({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={`inline-flex items-center gap-1.5 text-sm ${state.ok ? "text-accent-2" : "text-red-500"}`}
    >
      {state.ok ? <Check className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
      {state.message}
    </p>
  );
}

/** Excluir com confirmação; mostra "Excluindo…" enquanto a ação roda. */
export function DeleteButton({
  confirmText,
  onDelete,
  size = "md",
}: {
  confirmText: string;
  /** Se devolver `{ ok: false }`, a mensagem aparece ao lado do botão. */
  onDelete: () => Promise<ActionState | void>;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<ActionState>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          confirm(confirmText) &&
          start(async () => {
            const result = await onDelete();
            setError(result && !result.ok ? result : null);
          })
        }
        className={btn("danger", size)}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-3.5" aria-hidden />
        )}
        {pending ? "Excluindo…" : "Excluir"}
      </button>
      <Status state={error} />
    </span>
  );
}

/** Barra fixa no rodapé dos formulários de página inteira (Perfil, Projeto). */
export function SaveBar({
  state,
  label,
  children,
}: {
  state: ActionState;
  label: string;
  /** Ações secundárias, alinhadas à direita (ex.: excluir). */
  children?: ReactNode;
}) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-full border border-line bg-surface/90 p-1.5 pr-3 shadow-lg shadow-black/10 backdrop-blur">
      <SubmitButton>{label}</SubmitButton>
      <Status state={state} />
      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
}

export function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-accent-solid peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

/** Campo traduzível: abas PT/EN/FR; os 3 inputs ficam no form (name.pt, name.en, name.fr). */
export function LocalizedField({
  name,
  label,
  defaultValue,
  multiline,
  rows = 3,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: unknown;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  const [tab, setTab] = useState<Locale>("pt");
  const values = (defaultValue && typeof defaultValue === "object" ? defaultValue : {}) as Partial<
    Record<Locale, string>
  >;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <div className="flex gap-0.5 rounded-full border border-line p-0.5 font-mono text-[10px]">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={`rounded-full px-2 py-0.5 ${tab === l ? "bg-accent-solid text-white" : "text-muted hover:text-fg"}`}
            >
              {localeLabels[l]}
              {values[l] ? "" : " ·"}
            </button>
          ))}
        </div>
      </div>
      {locales.map((l) => {
        const common = {
          name: `${name}.${l}`,
          defaultValue: values[l] ?? "",
          placeholder: placeholder ? `${placeholder} (${localeLabels[l]})` : localeLabels[l],
          className: `${inputCls} ${tab === l ? "" : "hidden"}`,
          lang: l,
          "aria-label": `${label} (${localeLabels[l]})`,
        };
        return multiline ? <textarea key={l} rows={rows} {...common} /> : <input key={l} {...common} />;
      })}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </div>
  );
}
