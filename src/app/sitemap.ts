import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}`]));
  return locales.map((l) => ({
    url: `${siteUrl}/${l}`,
    changeFrequency: "monthly",
    priority: l === "pt" ? 1 : 0.8,
    alternates: { languages },
  }));
}
