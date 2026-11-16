import type { Json } from "@/lib/supabase/database.types";
import { locales, type Locale } from "@/i18n/config";

export type LocalizedText = Partial<Record<Locale, string>>;

/** Lê um campo traduzível {pt,en,fr}; cai para outro idioma se faltar. */
export function tr(value: Json | undefined, locale: Locale): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return typeof value === "string" ? value : "";
  }
  const v = value as Record<string, unknown>;
  const pick = (l: string) => (typeof v[l] === "string" ? (v[l] as string).trim() : "");
  return pick(locale) || locales.map(pick).find(Boolean) || "";
}
