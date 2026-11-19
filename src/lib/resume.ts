import "server-only";
import { createHash } from "node:crypto";
import type { Locale } from "@/i18n/config";

const STORAGE_PREFIX = "/storage/v1/object/public/resume/";

/** Só servimos PDFs do bucket `resume` do nosso Supabase (evita virar proxy de qualquer URL). */
export function isResumeStorageUrl(src: string): boolean {
  try {
    const url = new URL(src);
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return url.origin === base.origin && url.pathname.startsWith(STORAGE_PREFIX);
  } catch {
    return false;
  }
}

/** Muda quando o arquivo muda, então a URL pode ficar em cache "para sempre". */
export function resumeVersion(src: string): string {
  return createHash("sha256").update(src).digest("hex").slice(0, 12);
}

/** Link do botão de download: passa pela CDN da Vercel em vez de ir direto ao Storage. */
export function resumeHref(src: string, locale: Locale): string | null {
  if (!src) return null;
  if (!isResumeStorageUrl(src)) return src;
  return `/api/cv/${locale}?v=${resumeVersion(src)}`;
}

/** Nome original do upload, sem o prefixo numérico que o painel acrescenta. */
export function resumeFileName(src: string): string {
  const last = decodeURIComponent(new URL(src).pathname.split("/").pop() ?? "");
  const name = last.replace(/^\d+-/, "").replace(/[^\w.-]/g, "_");
  return name.toLowerCase().endsWith(".pdf") ? name : "curriculo.pdf";
}
