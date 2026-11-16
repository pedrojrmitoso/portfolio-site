"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Field, inputCls } from "./ui";

type Enrollment = { factorId: string; qr: string; secret: string };

/** O Supabase devolve o QR como SVG puro ou já como data URI, conforme a versão. */
function qrSrc(qr: string) {
  return qr.startsWith("data:") ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`;
}

/** Verificação em duas etapas (TOTP) da conta do admin. */
export function MfaSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await getBrowserClient().auth.mfa.listFactors();
    setActiveFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
    setLoading(false);
  }, []);

  // Carga inicial: lê os fatores e só então atualiza o estado
  useEffect(() => {
    let cancelled = false;
    getBrowserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        if (cancelled) return;
        setActiveFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function start() {
    setBusy(true);
    setMsg(null);
    const mfa = getBrowserClient().auth.mfa;
    // Remove tentativas anteriores não concluídas (o nome do fator precisa ser único)
    const { data: factors } = await mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.factor_type === "totp" && f.status !== "verified") await mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await mfa.enroll({ factorType: "totp", friendlyName: "Autenticador" });
    setBusy(false);
    if (error || !data) {
      setMsg({ ok: false, text: error?.message ?? "Não foi possível iniciar." });
      return;
    }
    setEnrollment({ factorId: data.id, qr: qrSrc(data.totp.qr_code), secret: data.totp.secret });
  }

  async function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrollment) return;
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    setBusy(true);
    setMsg(null);
    const { error } = await getBrowserClient().auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: "Código inválido. Confira o horário do celular e tente de novo." });
      return;
    }
    setEnrollment(null);
    setMsg({ ok: true, text: "Verificação em duas etapas ativada." });
    await refresh();
    router.refresh();
  }

  async function disable() {
    if (!activeFactorId) return;
    if (!window.confirm("Desativar a verificação em duas etapas? A conta ficará protegida só pela senha."))
      return;
    setBusy(true);
    setMsg(null);
    const { error } = await getBrowserClient().auth.mfa.unenroll({ factorId: activeFactorId });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    setMsg({ ok: true, text: "Verificação em duas etapas desativada." });
    await refresh();
    router.refresh();
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activeFactorId ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-5 text-accent-2" aria-hidden />
            Ativa. O login pede o código do app autenticador.
          </p>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-red-500 disabled:opacity-60"
          >
            <ShieldOff className="size-4" /> Desativar
          </button>
        </div>
      ) : enrollment ? (
        <form onSubmit={onConfirm} className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Abra um app autenticador (Google Authenticator, 1Password, Authy…).</li>
            <li>Escaneie o QR code ou digite a chave manualmente.</li>
            <li>Digite o código de 6 dígitos gerado pelo app.</li>
          </ol>
          <div className="flex flex-wrap items-start gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollment.qr}
              alt="QR code para o app autenticador"
              className="size-44 rounded-xl bg-white p-2"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <Field label="Chave manual">
                <input readOnly value={enrollment.secret} className={`${inputCls} font-mono text-xs`} />
              </Field>
              <Field label="Código do app">
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  required
                  className={`${inputCls} text-center font-mono text-lg tracking-[0.4em]`}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-solid px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Ativar
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollment(null)}
                  className="text-sm text-muted hover:text-fg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Desativada. Recomendado: peça um código do celular a cada login.
          </p>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-accent-solid px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Ativar verificação em duas etapas
          </button>
        </div>
      )}
      {msg && (
        <p
          role="status"
          className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-accent-2" : "text-red-500"}`}
        >
          {msg.ok && <Check className="size-4" />}
          {msg.text}
        </p>
      )}
    </div>
  );
}
