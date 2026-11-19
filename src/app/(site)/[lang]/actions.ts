"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { notifyNewMessage, projectTypes, type ProjectType } from "@/lib/contact-notify";
import { hasLocale } from "@/i18n/config";

export type ContactState = { status: "ok" } | { status: "error"; code: "invalid" | "rate" | "server" } | null;

/** Rígido de propósito: nada de ?, &, = ou # (viram parâmetros no mailto do painel). Igual à migration 0007. */
const EMAIL = /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
/** Envio mais rápido que isso depois de abrir a página é robô. */
const MIN_FILL_MS = 3000;

export async function sendContactMessage(_: ContactState, fd: FormData): Promise<ContactState> {
  const field = (k: string) => String(fd.get(k) ?? "").trim();

  // Anti-spam: campo invisível preenchido ou envio instantâneo → finge sucesso e descarta
  const startedAt = Number(field("t"));
  if (field("website") || !startedAt || Date.now() - startedAt < MIN_FILL_MS) return { status: "ok" };

  const name = field("name");
  const email = field("email").toLowerCase();
  const projectType = field("project_type") as ProjectType;
  const message = field("message");
  const lang = field("locale");
  const locale = hasLocale(lang) ? lang : "pt";

  if (
    !name ||
    name.length > 120 ||
    !EMAIL.test(email) ||
    email.length > 200 ||
    !projectTypes.includes(projectType) ||
    message.length < 10 ||
    message.length > 5000
  ) {
    return { status: "error", code: "invalid" };
  }

  const h = await headers();
  // x-real-ip é definido pela Vercel; o 1º valor de x-forwarded-for pode vir do cliente
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim() || "";
  const ipHash = ip ? createHash("sha256").update(`contact:${ip}`).digest("hex") : null;

  // Chave secreta: a função não é pública (migration 0009), então o hash do IP vem sempre daqui
  const { error } = await createAdminClient().rpc("submit_contact_message", {
    p_name: name,
    p_email: email,
    p_project_type: projectType,
    p_message: message,
    p_locale: locale,
    p_ip_hash: ipHash,
  });
  if (error) {
    if (error.message.includes("rate_limited")) return { status: "error", code: "rate" };
    console.error("contact:", error.message);
    return { status: "error", code: "server" };
  }

  // E-mail depois da resposta: o visitante não espera, e uma falha no envio não perde a mensagem
  after(async () => {
    const { data: profile } = await createPublicClient().from("profile").select("email").eq("id", 1).maybeSingle();
    await notifyNewMessage({ name, email, projectType, message, locale }, profile?.email ?? null).catch((e) =>
      console.error("contact notify:", e),
    );
  });

  return { status: "ok" };
}
