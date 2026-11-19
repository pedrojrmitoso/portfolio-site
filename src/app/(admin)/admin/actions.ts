"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { PORTFOLIO_TAG } from "@/lib/data";
import { locales } from "@/i18n/config";

export type ActionState = { ok: boolean; message: string } | null;

// ---------- helpers de formulário ----------
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const int = (fd: FormData, k: string) => Number.parseInt(str(fd, k) || "0", 10) || 0;
const nullable = (v: string) => (v === "" ? null : v);

/** Lê `${k}.pt`, `${k}.en`, `${k}.fr` -> {pt,en,fr} (sem chaves vazias) */
function localized(fd: FormData, k: string) {
  const out: Record<string, string> = {};
  for (const l of locales) {
    const v = str(fd, `${k}.${l}`);
    if (v) out[l] = v;
  }
  return out;
}

class ValidationError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aceita só http(s), mailto ou caminho local — bloqueia javascript: e afins. */
function safeUrl(value: string, label: string, { allowMailto = false } = {}) {
  if (!value) return null;
  // Caminho local, mas não "//host" nem "/\\host" (o navegador trata ambos como outro domínio)
  if (/^\/(?![/\\])/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    if (allowMailto && u.protocol === "mailto:") return value;
  } catch {}
  throw new ValidationError(`${label}: URL inválida (use https://...)`);
}

function isMediaUrl(value: string) {
  try {
    const u = new URL(value);
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return u.origin === base.origin && u.pathname.startsWith("/storage/v1/object/public/media/");
  } catch {
    return false;
  }
}

async function run(fn: () => Promise<string>): Promise<ActionState> {
  try {
    const message = await fn();
    updateTag(PORTFOLIO_TAG); // site público atualiza na hora
    return { ok: true, message };
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, message: e.message };
    // redirect()/notFound() do Next precisam propagar
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar" };
  }
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ---------- Perfil ----------
export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const resume: Record<string, string> = {};
    for (const l of locales) {
      const url = safeUrl(str(fd, `resume_url.${l}`), `Currículo (${l})`);
      if (url) resume[l] = url;
    }
    const email = str(fd, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("E-mail inválido");

    const { error } = await supabase.from("profile").upsert({
      id: 1,
      full_name: str(fd, "full_name"),
      role: localized(fd, "role"),
      bio: localized(fd, "bio"),
      location: nullable(str(fd, "location")),
      email: nullable(email),
      avatar_url: safeUrl(str(fd, "avatar_url"), "Foto"),
      resume_url: resume,
      available: bool(fd, "available"),
    });
    check(error);
    return "Perfil salvo";
  });
}

// ---------- Projetos ----------
const MAX_GALLERY = 20;

function parseGallery(raw: string) {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    throw new ValidationError("Galeria inválida");
  }
  if (!Array.isArray(data)) throw new ValidationError("Galeria inválida");
  if (data.length > MAX_GALLERY) throw new ValidationError(`Máximo de ${MAX_GALLERY} fotos por projeto`);

  return data.map((item, i) => {
    const url = item && typeof item === "object" && typeof item.url === "string" ? item.url : "";
    const alt: Record<string, string> = {};
    if (item?.alt && typeof item.alt === "object") {
      for (const l of locales) if (typeof item.alt[l] === "string") alt[l] = item.alt[l];
    }
    return {
      url: safeUrl(url, `Foto ${i + 1}`) ?? fail(`Foto ${i + 1}: URL ausente`),
      alt,
      sort_order: i + 1,
    };
  });
}

function fail(message: string): never {
  throw new ValidationError(message);
}

export async function saveProject(_: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await run(async () => {
    const { supabase } = await requireAdmin();
    const id = str(fd, "id");
    const slug = str(fd, "slug").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError("Slug inválido: use letras minúsculas, números e hífens (ex.: meu-projeto)");
    }
    const title = localized(fd, "title");
    if (!Object.keys(title).length) throw new ValidationError("Informe o título em pelo menos um idioma");

    const images = parseGallery(str(fd, "images"));
    const techIds = fd.getAll("tech").map(String).filter(Boolean);
    if (!techIds.every((id) => UUID.test(id))) throw new ValidationError("Tecnologia inválida");

    const row = {
      slug,
      title,
      summary: localized(fd, "summary"),
      description: localized(fd, "description"),
      thumbnail_url: safeUrl(str(fd, "thumbnail_url"), "Thumb"),
      demo_url: safeUrl(str(fd, "demo_url"), "Link do projeto"),
      repo_url: safeUrl(str(fd, "repo_url"), "Repositório"),
      featured: bool(fd, "featured"),
      published: bool(fd, "published"),
    };

    let projectId = id;
    if (id) {
      // A ordem é definida arrastando na lista; editar o projeto não a altera
      const { error } = await supabase.from("projects").update(row).eq("id", id);
      check(error);
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...row, sort_order: int(fd, "sort_order") })
        .select("id")
        .single();
      check(error);
      projectId = data!.id;
      createdId = projectId;
    }

    // Substitui galeria e tecnologias numa única transação (função no banco)
    const { error: relError } = await supabase.rpc("set_project_relations", {
      p_project_id: projectId,
      p_images: images,
      p_technology_ids: techIds,
    });
    check(relError);
    return "Projeto salvo";
  });
  if (createdId) redirect(`/admin/projetos/${createdId}?saved=1`);
  return result;
}

export async function deleteProject(id: string): Promise<ActionState> {
  const result = await run(async () => {
    const { supabase } = await requireAdmin();
    check((await supabase.from("projects").delete().eq("id", id)).error);
    return "Projeto excluído";
  });
  if (!result?.ok) return result;
  redirect("/admin/projetos");
}

// ---------- Tecnologias ----------
export async function saveTechnology(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const name = str(fd, "name");
    if (!name) throw new ValidationError("Informe o nome");
    const color = str(fd, "color");
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new ValidationError("Cor: use o formato #RRGGBB");
    // Ícone próprio: só imagens enviadas para o nosso bucket `media`
    const iconUrl = str(fd, "icon_url");
    if (iconUrl && !isMediaUrl(iconUrl)) throw new ValidationError("Ícone: envie a imagem pelo painel");
    const row = {
      name,
      icon: iconUrl ? null : nullable(str(fd, "icon")),
      icon_url: nullable(iconUrl),
      color: nullable(color),
      category: str(fd, "category") || "tools",
      show_in_stack: bool(fd, "show_in_stack"),
      description: localized(fd, "description"),
    };
    const id = str(fd, "id");
    // A ordem só é definida ao criar; depois, muda pelo arrastar e soltar
    const { error } = id
      ? await supabase.from("technologies").update(row).eq("id", id)
      : await supabase.from("technologies").insert({ ...row, sort_order: int(fd, "sort_order") });
    if (error?.code === "23505") throw new ValidationError(`Já existe uma tecnologia "${name}"`);
    check(error);
    return id ? "Tecnologia salva" : "Tecnologia adicionada";
  });
}

export async function deleteTechnology(id: string) {
  return run(async () => {
    const { supabase } = await requireAdmin();
    check((await supabase.from("technologies").delete().eq("id", id)).error);
    return "Tecnologia excluída";
  });
}

// ---------- Links ----------
export async function saveLink(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const platform = str(fd, "platform");
    let url = str(fd, "url");
    if (platform === "email" && url && !url.startsWith("mailto:")) url = `mailto:${url}`;
    // Aceita só o número ("+55 11 99999-9999") e monta o link wa.me
    if (platform === "whatsapp" && url && !/^https?:\/\//i.test(url)) {
      const digits = url.replace(/\D/g, "");
      if (digits.length < 10) throw new ValidationError("Informe o número com DDI e DDD");
      url = `https://wa.me/${digits}`;
    }
    const safe = safeUrl(url, "URL", { allowMailto: true });
    if (!safe) throw new ValidationError("Informe a URL");
    const row = {
      platform,
      label: nullable(str(fd, "label")),
      url: safe,
      visible: bool(fd, "visible"),
    };
    const id = str(fd, "id");
    // A ordem só é definida ao criar; depois, muda pelo arrastar e soltar
    const { error } = id
      ? await supabase.from("social_links").update(row).eq("id", id)
      : await supabase.from("social_links").insert({ ...row, sort_order: int(fd, "sort_order") });
    check(error);
    return id ? "Link salvo" : "Link adicionado";
  });
}

export async function deleteLink(id: string) {
  return run(async () => {
    const { supabase } = await requireAdmin();
    check((await supabase.from("social_links").delete().eq("id", id)).error);
    return "Link excluído";
  });
}

// ---------- Experiência ----------
export async function saveExperience(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { supabase } = await requireAdmin();
    const company = str(fd, "company");
    const start = str(fd, "start_date");
    if (!company || !start) throw new ValidationError("Informe empresa e data de início");
    const row = {
      company,
      role: localized(fd, "role"),
      description: localized(fd, "description"),
      start_date: start,
      end_date: nullable(str(fd, "end_date")),
    };
    const id = str(fd, "id");
    // A ordem só é definida ao criar; depois, muda pelo arrastar e soltar
    const { error } = id
      ? await supabase.from("experiences").update(row).eq("id", id)
      : await supabase.from("experiences").insert({ ...row, sort_order: int(fd, "sort_order") });
    check(error);
    return id ? "Experiência salva" : "Experiência adicionada";
  });
}

export async function deleteExperience(id: string) {
  return run(async () => {
    const { supabase } = await requireAdmin();
    check((await supabase.from("experiences").delete().eq("id", id)).error);
    return "Experiência excluída";
  });
}

// ---------- Mensagens do formulário de contato ----------
function messageIds(ids: unknown): string[] {
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 500 ||
    !ids.every((id) => typeof id === "string" && UUID.test(id))
  ) {
    throw new ValidationError("Seleção inválida");
  }
  return ids;
}

/** Marca uma ou várias mensagens como lidas / não lidas. */
export async function setMessagesRead(ids: string[], read: boolean) {
  return run(async () => {
    const valid = messageIds(ids);
    const { supabase } = await requireAdmin();
    check((await supabase.from("contact_messages").update({ read: !!read }).in("id", valid)).error);
    const n = valid.length;
    return `${n} mensage${n === 1 ? "m" : "ns"} marcada${n === 1 ? "" : "s"} como ${read ? "lida" : "não lida"}${n === 1 ? "" : "s"}`;
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Excluir = mover para a lixeira. O banco apaga de vez depois de 30 dias (pg_cron, migration 0008). */
export async function trashMessages(ids: string[]) {
  return run(async () => {
    const valid = messageIds(ids);
    const { supabase } = await requireAdmin();
    check(
      (
        await supabase
          .from("contact_messages")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", valid)
          .is("deleted_at", null)
      ).error,
    );
    return `${plural(valid.length, "mensagem movida", "mensagens movidas")} para a lixeira`;
  });
}

export async function restoreMessages(ids: string[]) {
  return run(async () => {
    const valid = messageIds(ids);
    const { supabase } = await requireAdmin();
    check((await supabase.from("contact_messages").update({ deleted_at: null }).in("id", valid)).error);
    return `${plural(valid.length, "mensagem restaurada", "mensagens restauradas")}`;
  });
}

/** Apagar definitivamente: só o que já está na lixeira. */
export async function purgeMessages(ids: string[]) {
  return run(async () => {
    const valid = messageIds(ids);
    const { supabase } = await requireAdmin();
    check(
      (await supabase.from("contact_messages").delete().in("id", valid).not("deleted_at", "is", null)).error,
    );
    return `${plural(valid.length, "mensagem apagada", "mensagens apagadas")} definitivamente`;
  });
}

export async function emptyTrash() {
  return run(async () => {
    const { supabase } = await requireAdmin();
    check((await supabase.from("contact_messages").delete().not("deleted_at", "is", null)).error);
    return "Lixeira esvaziada";
  });
}

// ---------- Ordem (arrastar e soltar) ----------
type ReorderRpc = "reorder_projects" | "reorder_technologies" | "reorder_links" | "reorder_experiences";

/** Posição na lista = sort_order. Uma única transação: ou a ordem inteira é salva, ou nada muda. */
async function reorder(rpc: ReorderRpc, ids: unknown): Promise<ActionState> {
  return run(async () => {
    if (
      !Array.isArray(ids) ||
      ids.length > 500 ||
      !ids.every((id) => typeof id === "string" && UUID.test(id))
    ) {
      throw new ValidationError("Ordem inválida");
    }
    const { supabase } = await requireAdmin();
    check((await supabase.rpc(rpc, { p_ids: ids })).error);
    return "Ordem salva";
  });
}

export async function reorderProjects(ids: string[]) {
  return reorder("reorder_projects", ids);
}

export async function reorderTechnologies(ids: string[]) {
  return reorder("reorder_technologies", ids);
}

export async function reorderLinks(ids: string[]) {
  return reorder("reorder_links", ids);
}

export async function reorderExperiences(ids: string[]) {
  return reorder("reorder_experiences", ids);
}

// ---------- Sessão ----------
export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
