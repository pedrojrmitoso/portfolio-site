"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Field, inputCls } from "./ui";

const MIN = 12;

/** Define nova senha para o usuário da sessão atual (troca de senha ou link de recuperação). */
export function PasswordForm({
  onDone,
  submitLabel = "Salvar senha",
  signOutOthers = false,
}: {
  onDone?: () => void;
  submitLabel?: string;
  /** Encerra as sessões em outros dispositivos após a troca (tela Conta). */
  signOutOthers?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password"));
    const confirm = String(fd.get("confirm"));
    if (password.length < MIN) return setMsg({ ok: false, text: `Use ao menos ${MIN} caracteres.` });
    if (password !== confirm) return setMsg({ ok: false, text: "As senhas não conferem." });

    setBusy(true);
    setMsg(null);
    const { error } = await getBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({
        ok: false,
        text:
          error.code === "same_password"
            ? "A nova senha deve ser diferente da atual."
            : error.code === "weak_password"
              ? "Senha fraca: misture letras, números e símbolos."
              : error.message,
      });
      return;
    }
    if (signOutOthers) await getBrowserClient().auth.signOut({ scope: "others" });
    form.reset();
    setMsg({
      ok: true,
      text: signOutOthers
        ? "Senha atualizada. Outros dispositivos foram desconectados."
        : "Senha atualizada.",
    });
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nova senha" hint={`Mínimo de ${MIN} caracteres.`}>
        <div className="relative">
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={MIN}
            autoComplete="new-password"
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted hover:text-fg"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirmar nova senha">
        <input
          name="confirm"
          type={show ? "text" : "password"}
          required
          minLength={MIN}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-accent-2" : "text-red-500"}`}>
          {msg.ok && <Check className="size-4" />}
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-accent-solid px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
