"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { Flag } from "./flags";

export function LanguageSwitcher({
  current,
  label,
  large,
}: {
  current: Locale;
  label: string;
  /** Alvos de toque de 44px (menu mobile) */
  large?: boolean;
}) {
  const pathname = usePathname() ?? `/${current}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav
      aria-label={label}
      className={`flex items-center gap-0.5 rounded-full border border-line bg-surface/60 p-0.5 font-mono ${large ? "text-sm" : "text-[11px]"}`}
    >
      {locales.map((l) => {
        const active = l === current;
        return (
          <Link
            key={l}
            href={`/${l}${rest ? `/${rest}` : ""}`}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            onClick={() => {
              document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
            }}
            className={`inline-flex items-center rounded-full transition-colors ${large ? "h-11 gap-2 px-3.5" : "gap-1.5 py-1 pr-2 pl-1"} ${
              active ? "bg-accent-solid text-white" : "text-muted hover:text-fg"
            }`}
          >
            <Flag locale={l} className={large ? "size-5" : "size-3.5"} />
            {localeLabels[l]}
          </Link>
        );
      })}
    </nav>
  );
}
