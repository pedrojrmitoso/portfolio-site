"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, Loader2, Send, TriangleAlert } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { sendContactMessage, type ContactState } from "@/app/(site)/[lang]/actions";
import { Turnstile, type TurnstileHandle } from "./turnstile";

type FormDict = Dictionary["contact"]["form"];

const inputCls =
  "w-full rounded-xl border border-line bg-bg/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block font-mono text-[11px] tracking-[0.12em] text-muted uppercase";

export function ContactForm({ dict, locale }: { dict: FormDict; locale: Locale }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef<HTMLInputElement>(null);
  const captcha = useRef<TurnstileHandle>(null);

  // Marca quando o formulário apareceu no navegador (a página é estática, então não pode vir do servidor)
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state?.status === "ok") formRef.current?.reset();
    // Token do Turnstile vale um envio só: pede outro para a próxima tentativa
    if (state) captcha.current?.reset();
  }, [state]);

  const error = state?.status === "error" ? dict[`error_${state.code}`] : null;

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input ref={startedAt} type="hidden" name="t" defaultValue="" />
      {/* Campo-isca: invisível para pessoas, robôs costumam preencher */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>{dict.name}</span>
        <input name="name" required maxLength={120} autoComplete="name" className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>{dict.email}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" className={inputCls} />
      </label>

      <label className="block sm:col-span-2">
        <span className={labelCls}>{dict.type}</span>
        <select name="project_type" defaultValue="bi" className={inputCls}>
          {(Object.keys(dict.types) as (keyof FormDict["types"])[]).map((k) => (
            <option key={k} value={k}>
              {dict.types[k]}
            </option>
          ))}
        </select>
      </label>

      <label className="block sm:col-span-2">
        <span className={labelCls}>{dict.message}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder={dict.message_placeholder}
          className={`${inputCls} resize-y`}
        />
      </label>

      <Turnstile ref={captcha} language={locale} />

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-accent-solid px-6 text-base font-medium text-white shadow-[0_12px_32px_-10px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <Send className="size-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden />
          )}
          {pending ? dict.sending : dict.submit}
        </button>

        <p role="status" aria-live="polite" className="text-sm">
          {state?.status === "ok" && (
            <span className="inline-flex items-center gap-1.5 text-accent-2">
              <Check className="size-4" aria-hidden /> {dict.success}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 text-red-500">
              <TriangleAlert className="size-4 shrink-0" aria-hidden /> {error}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
