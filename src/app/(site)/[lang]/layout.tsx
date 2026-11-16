import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { locales } from "@/i18n/config";
import { SiteHeader } from "@/components/site/header";
import { getPortfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { siteUrl } from "@/lib/site";
import "../../globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), getPortfolio()]);
  const name = data.profile?.full_name;
  const role = tr(data.profile?.role, locale);
  const title = name ? `${name}${role ? ` — ${role}` : ""}` : dict.meta.title;
  const description = tr(data.profile?.bio, locale) || dict.meta.description;
  const ogLocale = { pt: "pt_BR", en: "en_US", fr: "fr_FR" }[locale];

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}`])), "x-default": "/pt" },
    },
    openGraph: { type: "profile", title, description, url: `/${locale}`, locale: ogLocale, siteName: name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${bricolage.variable} ${geist.variable} ${jetbrains.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-instrument min-h-dvh overflow-x-clip">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
