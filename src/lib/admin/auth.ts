import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { redirectFor, sessionState } from "./session";

/**
 * Data Access Layer do painel: sessão de senha (+ 2 fatores, se ativos) E usuário em `admins`.
 * Chamar em toda página e Server Action do /admin. O banco aplica a mesma regra (private.is_admin).
 */
export async function requireAdmin() {
  // Sessão é sempre por requisição (o cliente usa o relógio para validar o token)
  await connection();
  const supabase = await createSessionClient();
  const [{ data: claimsData }, { data: assurance }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const state = sessionState(claimsData?.claims, assurance);
  if (state !== "ok") redirect(redirectFor(state));

  const userId = claimsData!.claims.sub;
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) redirect("/admin/login?error=not_admin");

  return { supabase, userId, email: (claimsData!.claims.email as string | undefined) ?? "" };
}
