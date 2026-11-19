"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { Flag } from "./flags";

export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${current}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav
      aria-label={label}
      className={`flex items-center gap-0.5 rounded-full border border-line bg-surface/60 p-0.5 font-mono text-xs sm:text-[11px]`}
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
            className={`inline-flex items-center rounded-full transition-colors h-9 gap-1.5 pr-2.5 pl-1.5 max-[374px]:px-2 sm:h-auto sm:py-1 sm:pr-2 sm:pl-1 ${
              active ? "bg-accent-solid text-white" : "text-muted hover:text-fg"
            }`}
          >
            <Flag locale={l} className="size-4 sm:size-3.5" />
            <span className="max-[374px]:sr-only">{localeLabels[l]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
