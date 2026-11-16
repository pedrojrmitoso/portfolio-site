"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { PasswordForm } from "@/components/admin/password-form";

type Status = "checking" | "ready" | "invalid";

/**
 * Destino do link de e-mail (recuperação/primeiro acesso).
 * Fluxo PKCE: troca o ?code= por uma sessão e então permite definir a senha.
 */
export function ResetPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // O code é de uso único: tira da URL (histórico, compartilhamento)
        window.history.replaceState(null, "", window.location.pathname);
        if (!cancelled) setStatus(error ? "invalid" : "ready");
        return;
      }
      // Sem code: aceita se já houver sessão (ex.: link aberto de novo)
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setStatus(data.session ? "ready" : "invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (status === "checking") {
    return (
      <p className="mt-6 flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Validando link…
      </p>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mt-6 space-y-4 text-sm">
        <p className="text-red-500">
          Link inválido ou expirado. Abra o link no mesmo navegador em que pediu a redefinição, ou peça um
          novo.
        </p>
        <Link href="/admin/login" className="text-muted hover:text-fg">
          ← Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <PasswordForm
        submitLabel="Definir nova senha"
        onDone={async () => {
          // Encerra a sessão de recuperação (e as demais): o acesso volta só com a senha nova
          await getBrowserClient().auth.signOut({ scope: "global" });
          router.replace("/admin/login?reset=1");
          router.refresh();
        }}
      />
    </div>
  );
}
