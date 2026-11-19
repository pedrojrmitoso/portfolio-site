import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/config";
import { getPortfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { isResumeStorageUrl, resumeFileName, resumeVersion } from "@/lib/resume";

/**
 * Download do currículo pela CDN da Vercel. A URL é versionada (?v=hash do arquivo),
 * então a resposta fica em cache por um ano e downloads repetidos não chegam ao Supabase.
 * Versão errada ou ausente redireciona para a atual: trocar o ?v não fura o cache.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return new NextResponse("Not found", { status: 404 });

  const { profile } = await getPortfolio();
  const src = tr(profile?.resume_url, lang);
  if (!src || !isResumeStorageUrl(src)) return new NextResponse("Not found", { status: 404 });

  const version = resumeVersion(src);
  if (req.nextUrl.searchParams.get("v") !== version) {
    const res = NextResponse.redirect(new URL(`/api/cv/${lang}?v=${version}`, req.url), 307);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const upstream = await fetch(src);
  if (!upstream.ok || !upstream.body) return new NextResponse("Unavailable", { status: 502 });

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resumeFileName(src)}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
