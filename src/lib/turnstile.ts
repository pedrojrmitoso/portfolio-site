import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("turnstile:", data["error-codes"]?.join(",") ?? "falhou");
    return data.success === true;
  } catch (e) {
    console.error("turnstile:", e);
    return false;
  }
}
