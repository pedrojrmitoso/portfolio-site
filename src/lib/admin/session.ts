/**
 * Regras de sessão do painel (mesma regra aplicada no banco em private.is_admin()).
 *
 * - recovery:      entrou pelo link de "esqueci minha senha" → só pode definir a senha nova
 * - untrusted:     login sem senha (link mágico / código por e-mail) → não acessa o painel
 * - mfa_required:  tem 2 fatores ativos e ainda não informou o código → pede o código
 * - ok:            senha (+ código, se 2 fatores ativos)
 */
export type SessionState = "none" | "recovery" | "untrusted" | "mfa_required" | "ok";

export type AssuranceLevel = { currentLevel: string | null; nextLevel: string | null } | null;

type Claims = Record<string, unknown> | null | undefined;

function methods(claims: Claims): string[] {
  const amr = claims?.amr;
  return Array.isArray(amr) ? amr.map((m) => String((m as { method?: unknown })?.method ?? "")) : [];
}

export function isRecoverySession(claims: Claims) {
  return methods(claims).includes("recovery");
}

export function sessionState(claims: Claims, assurance: AssuranceLevel): SessionState {
  if (!claims?.sub) return "none";
  const amr = methods(claims);
  if (amr.includes("recovery")) return "recovery";
  if (!amr.includes("password") && !amr.includes("totp")) return "untrusted";
  if (assurance?.nextLevel === "aal2" && claims.aal !== "aal2") return "mfa_required";
  return "ok";
}

export const LOGIN_PATH = "/admin/login";
export const RESET_PASSWORD_PATH = "/admin/redefinir-senha";

/** Para onde mandar cada estado que não pode usar o painel. */
export function redirectFor(state: Exclude<SessionState, "ok">): string {
  switch (state) {
    case "none":
      return LOGIN_PATH;
    case "recovery":
      return RESET_PASSWORD_PATH;
    case "untrusted":
      return `${LOGIN_PATH}?error=method`;
    case "mfa_required":
      return `${LOGIN_PATH}?mfa=1`;
  }
}
