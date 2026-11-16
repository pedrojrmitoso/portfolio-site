"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Field, inputCls } from "@/components/admin/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "forgot" | "mfa">(params.get("mfa") === "1" ? "mfa" : "login");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const passwordReset = params.get("reset") === "1";
  const [error, setError] = useState<string | null>(
    params.get("error") === "not_admin"
      ? "Este usuário não tem acesso ao painel."
      : params.get("error") === "link"
        ? "Link inválido ou expirado. Peça um novo."
        : params.get("error") === "method"
          ? "Por segurança, o painel só aceita entrada com e-mail e senha."
          : null,
  );

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await getBrowserClient().auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setError("E-mail ou senha inválidos.");
      setBusy(false);
      return;
    }
    // 2 fatores ativos: pede o código do app autenticador antes de entrar
    const { data: aal } = await getBrowserClient().auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      setBusy(false);
      setMode("mfa");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await getBrowserClient().auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: `${window.location.origin}/admin/redefinir-senha`,
    });
    setBusy(false);
    // Limite de envio é o único erro que vale mostrar; resto: mensagem neutra
    if (error?.status === 429) {
      setError("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      return;
    }
    setSent(true);
  }

  if (mode === "mfa") {
    return (
      <MfaStep
        onDone={() => {
          router.replace("/admin");
          router.refresh();
        }}
        onCancel={async () => {
          await getBrowserClient().auth.signOut();
          setMode("login");
        }}
      />
    );
  }

  if (mode === "forgot") {
    return sent ? (
      <div className="mt-6 space-y-4 text-sm">
        <p className="flex items-start gap-2 text-accent-2">
          <MailCheck className="mt-0.5 size-4 shrink-0" />
          Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.
        </p>
        <button
          type="button"
          onClick={() => (setMode("login"), setSent(false))}
          className="text-muted hover:text-fg"
        >
          ← Voltar ao login
        </button>
      </div>
    ) : (
      <form onSubmit={onForgot} className="mt-6 space-y-4">
        <p className="text-sm text-muted">
          Informe seu e-mail para receber o link de criação/redefinição de senha.
        </p>
        <Field label="E-mail">
          <input name="email" type="email" required autoComplete="email" className={inputCls} />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Enviar link
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="w-full text-center text-sm text-muted hover:text-fg"
        >
          ← Voltar ao login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onLogin} className="mt-6 space-y-4">
      {passwordReset && !error && (
        <p className="flex items-start gap-2 text-sm text-accent-2">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Senha alterada. Entre com a nova senha.
        </p>
      )}
      <Field label="E-mail">
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </Field>
      <Field label="Senha">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </Field>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Entrar
      </button>
      <button
        type="button"
        onClick={() => (setMode("forgot"), setError(null))}
        className="w-full text-center text-sm text-muted hover:text-fg"
      >
        Esqueci minha senha / primeiro acesso
      </button>
    </form>
  );
}

/** Segundo fator: código de 6 dígitos do app autenticador (TOTP). */
function MfaStep({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      setBusy(false);
      setError("Não foi possível validar. Entre novamente com e-mail e senha.");
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) {
      setBusy(false);
      setError("Código inválido ou expirado. Confira o app autenticador.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        Digite o código de 6 dígitos do seu app autenticador.
      </p>
      <Field label="Código">
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className={`${inputCls} text-center font-mono text-lg tracking-[0.4em]`}
        />
      </Field>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Verificar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-muted hover:text-fg"
      >
        ← Entrar com outra conta
      </button>
    </form>
  );
}
