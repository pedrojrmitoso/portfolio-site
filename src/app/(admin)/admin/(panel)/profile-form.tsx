"use client";

import { useActionState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { saveProfile } from "../actions";
import { Card, Field, inputCls, LocalizedField, SaveBar, Toggle } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/upload";
import { localeLabels, locales } from "@/i18n/config";

export function ProfileForm({ profile }: { profile: Tables<"profile"> | null }) {
  const [state, action] = useActionState(saveProfile, null);
  const resume = (profile?.resume_url ?? {}) as Record<string, string>;

  return (
    <form action={action} className="space-y-6">
      <Card title="Identidade">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome completo">
              <input name="full_name" defaultValue={profile?.full_name ?? ""} required className={inputCls} />
            </Field>
            <Field label="Localização">
              <input
                name="location"
                defaultValue={profile?.location ?? ""}
                placeholder="São Paulo, Brasil"
                className={inputCls}
              />
            </Field>
          </div>
          <LocalizedField
            name="role"
            label="Cargo / tagline"
            defaultValue={profile?.role}
            placeholder="Cientista de Dados · BI · IA"
          />
          <LocalizedField
            name="bio"
            label="Bio"
            defaultValue={profile?.bio}
            multiline
            rows={3}
            hint="Curta e direta: 1–2 frases sobre o valor que você entrega."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="E-mail público">
              <input name="email" type="email" defaultValue={profile?.email ?? ""} className={inputCls} />
            </Field>
            <div className="flex items-end pb-2">
              <Toggle
                name="available"
                label="Disponível para projetos"
                defaultChecked={profile?.available ?? true}
              />
            </div>
          </div>
          <UploadField
            name="avatar_url"
            label="Foto"
            defaultValue={profile?.avatar_url}
            folder="avatar"
            hint="Quadrada, ao menos 400×400."
          />
        </div>
      </Card>

      <Card title="Currículo (PDF)">
        <p className="-mt-2 mb-5 text-sm text-muted">
          Um PDF por idioma. Se faltar algum, o botão usa o de outro idioma.
        </p>
        <div className="space-y-5">
          {locales.map((l) => (
            <UploadField
              key={l}
              name={`resume_url.${l}`}
              label={`Currículo ${localeLabels[l]}`}
              defaultValue={resume[l]}
              bucket="resume"
              folder={l}
              kind="pdf"
            />
          ))}
        </div>
      </Card>

      <SaveBar state={state} label="Salvar perfil" />
    </form>
  );
}
