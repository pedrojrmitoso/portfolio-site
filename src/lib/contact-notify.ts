import "server-only";

export const projectTypes = ["bi", "data", "ai", "other"] as const;
export type ProjectType = (typeof projectTypes)[number];

const typeLabels: Record<ProjectType, string> = {
  bi: "Dashboard / BI",
  data: "Engenharia de dados",
  ai: "IA / Machine Learning",
  other: "Outro",
};

type Message = { name: string; email: string; projectType: ProjectType; message: string; locale: string };

/**
 * Avisa por e-mail (Resend) que chegou mensagem nova.
 * Sem RESEND_API_KEY ou sem destinatário, não faz nada: a mensagem já está salva no painel.
 */
export async function notifyNewMessage(msg: Message, fallbackTo: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || fallbackTo;
  if (!apiKey || !to) return;

  const from = process.env.CONTACT_FROM_EMAIL || "Portfólio <onboarding@resend.dev>";
  const text = [
    `Nova mensagem pelo portfólio`,
    ``,
    `Nome: ${msg.name}`,
    `E-mail: ${msg.email}`,
    `Tipo de projeto: ${typeLabels[msg.projectType]}`,
    `Idioma: ${msg.locale}`,
    ``,
    msg.message,
    ``,
    `— Responda este e-mail para falar direto com ${msg.name}.`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: msg.email,
      subject: `Contato: ${msg.name} · ${typeLabels[msg.projectType]}`,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("Resend:", res.status, await res.text().catch(() => ""));
}
