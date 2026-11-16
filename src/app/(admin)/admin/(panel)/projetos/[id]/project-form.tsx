"use client";

import { useActionState, useState } from "react";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { deleteProject, saveProject } from "../../../actions";
import { Card, DeleteButton, Field, inputCls, LocalizedField, SaveBar, Toggle } from "@/components/admin/ui";
import { GalleryField, UploadField } from "@/components/admin/upload";
import { TechIcon, techCategories } from "@/lib/tech-icons";

type Project = Tables<"projects"> & {
  project_images: { url: string; alt: Json; sort_order: number }[];
  project_technologies: { technology_id: string }[];
};
type Tech = Pick<Tables<"technologies">, "id" | "name" | "icon" | "color" | "category">;

const categoryLabels: Record<string, string> = {
  languages: "Linguagens",
  data: "Dados",
  bi: "BI",
  ai: "IA / ML",
  cloud: "Cloud / Bancos",
  tools: "Ferramentas",
};

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProjectForm({
  project,
  technologies,
  nextOrder,
  justSaved,
}: {
  project: Project | null;
  technologies: Tech[];
  nextOrder: number;
  justSaved: boolean;
}) {
  const [state, action] = useActionState(
    saveProject,
    justSaved ? { ok: true, message: "Projeto criado" } : null,
  );
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!project);
  const selected = new Set(project?.project_technologies.map((t) => t.technology_id));
  const gallery = [...(project?.project_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, alt: i.alt }));
  const folder = `projects/${project?.slug || "novo"}`;

  const groups = [...techCategories, "other"]
    .map((c) => ({
      c,
      items: technologies.filter((t) =>
        c === "other" ? !(techCategories as readonly string[]).includes(t.category) : t.category === c,
      ),
    }))
    .filter((g) => g.items.length);

  return (
    <form action={action} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}
      {!project && <input type="hidden" name="sort_order" value={nextOrder} />}

      <Card title="Conteúdo">
        <div className="space-y-5">
          <div
            onInput={(e) => {
              const t = e.target as HTMLInputElement;
              if (!slugTouched && t.name === "title.pt") setSlug(slugify(t.value));
            }}
          >
            <LocalizedField
              name="title"
              label="Título"
              defaultValue={project?.title}
              placeholder="Previsão de Churn"
            />
          </div>
          <LocalizedField
            name="summary"
            label="Resumo (1 linha no card)"
            defaultValue={project?.summary}
            hint="Resultado concreto, ex.: “Reduziu churn em 12%”."
          />
          <LocalizedField
            name="description"
            label="Descrição (no modal)"
            defaultValue={project?.description}
            multiline
            rows={4}
          />
        </div>
      </Card>

      <Card title="Imagens">
        <div className="space-y-6">
          <UploadField
            name="thumbnail_url"
            label="Thumb do card (16:9)"
            defaultValue={project?.thumbnail_url}
            folder={folder}
            hint="Recomendado 1200×675, WebP/JPG."
          />
          <GalleryField name="images" defaultValue={gallery} folder={folder} />
        </div>
      </Card>

      <Card title="Tecnologias">
        {technologies.length === 0 ? (
          <p className="text-sm text-muted">Cadastre tecnologias em “Tecnologias” primeiro.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <fieldset key={g.c}>
                <legend className="mb-2 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
                  {categoryLabels[g.c] ?? "Outros"}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((t) => (
                    <label key={t.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="tech"
                        value={t.id}
                        defaultChecked={selected.has(t.id)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm transition-colors peer-checked:border-accent peer-checked:bg-accent/15 peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                        <TechIcon icon={t.icon} color={t.color} name={t.name} className="size-4" />
                        {t.name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </Card>

      <Card title="Links e exibição">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Link do projeto (demo)">
              <input
                name="demo_url"
                type="url"
                defaultValue={project?.demo_url ?? ""}
                placeholder="https://"
                className={inputCls}
              />
            </Field>
            <Field label="Repositório (GitHub)">
              <input
                name="repo_url"
                type="url"
                defaultValue={project?.repo_url ?? ""}
                placeholder="https://github.com/…"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Slug (identificador)" hint="Gerado do título PT; minúsculas e hífens.">
              <input
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Toggle name="published" label="Publicado" defaultChecked={project?.published ?? true} />
            <Toggle name="featured" label="Destaque" defaultChecked={project?.featured ?? false} />
          </div>
        </div>
      </Card>

      <SaveBar state={state} label={project ? "Salvar projeto" : "Criar projeto"}>
        {project && (
          <DeleteButton
            confirmText="Excluir este projeto? Isso não pode ser desfeito."
            onDelete={() => deleteProject(project.id)}
          />
        )}
      </SaveBar>
    </form>
  );
}
