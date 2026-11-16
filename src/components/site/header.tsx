import { Download } from "lucide-react";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPortfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";

export async function SiteHeader() {
  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), getPortfolio()]);
  const resume = tr(data.profile?.resume_url, locale) || null;
  const firstName = data.profile?.full_name.split(" ")[0]?.toLowerCase() || "portfolio";
  const links = [
    { href: "#about", label: dict.nav.about },
    { href: "#stack", label: dict.nav.stack },
    { href: "#projects", label: dict.nav.projects },
    { href: "#contact", label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" className="-my-3 inline-block py-3 font-mono text-sm tracking-tight text-fg">
          <span className="text-accent">~/</span>
          {firstName}
        </a>

        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageSwitcher current={locale} label={dict.language} />
            <ThemeToggle labels={dict.theme} />
          </div>
          {resume && (
            <a
              href={resume}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="hidden items-center gap-1.5 rounded-full bg-accent-solid px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 md:inline-flex"
            >
              <Download className="size-3.5" aria-hidden />
              {dict.nav.resume}
            </a>
          )}
          <MobileMenu
            links={links}
            resume={resume}
            labels={{ menu: dict.nav.menu, close: dict.nav.close, resume: dict.hero.cta_resume }}
            controls={
              <div className="flex flex-wrap items-center gap-3 sm:hidden">
                <LanguageSwitcher current={locale} label={dict.language} large />
                <ThemeToggle labels={dict.theme} large />
              </div>
            }
          />
        </div>
      </div>
    </header>
  );
}
