import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Deve bater com o `action` do widget (src/components/site/turnstile.tsx). */
export const TURNSTILE_ACTION = "contact";

/** Chaves de teste da Cloudflare (1x…, 2x…, 3x…) não devolvem hostname nem action reais. */
const isTestSecret = (secret: string) => /^[123]x0{30,}/.test(secret);

/** Domínios onde o widget pode ter sido resolvido: produção, domínio próprio e o deploy atual. */
function allowedHostnames() {
  const hosts = new Set<string>();
  for (const v of [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]) {
    if (!v) continue;
    try {
      hosts.add(new URL(v.includes("://") ? v : `https://${v}`).hostname);
    } catch {
      // valor inválido: ignora
    }
  }
  if (process.env.NODE_ENV !== "production") hosts.add("localhost");
  return hosts;
}

/**
 * Valida o token do Cloudflare Turnstile. Sem a chave secreta configurada, falha fechado:
 * melhor recusar o envio do que aceitar robô em silêncio.
 */
export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("turnstile: TURNSTILE_SECRET_KEY não definida (veja .env.example)");
    return false;
  }
  if (!token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      "error-codes"?: string[];
    };
    if (!data.success) {
      console.warn("turnstile:", data["error-codes"]?.join(",") ?? "falhou");
      return false;
    }
    if (isTestSecret(secret)) return true;

    // Token válido, mas emitido para outro domínio ou outro widget da mesma conta: recusa
    if (data.action !== TURNSTILE_ACTION || !data.hostname || !allowedHostnames().has(data.hostname)) {
      console.warn("turnstile: action/hostname inesperados", data.action, data.hostname);
      return false;
    }
    return true;
  } catch (e) {
    console.error("turnstile:", e);
    return false;
  }
}
