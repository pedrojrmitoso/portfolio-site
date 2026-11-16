import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getPortfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { siteUrl } from "@/lib/site";
import { Hero } from "@/components/site/hero";
import { About } from "@/components/site/about";
import { Stack } from "@/components/site/stack";
import { Projects } from "@/components/site/projects";
import { Contact } from "@/components/site/contact";

export default async function Home() {
  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), getPortfolio()]);

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.profile?.full_name,
    jobTitle: tr(data.profile?.role, locale) || undefined,
    description: tr(data.profile?.bio, locale) || undefined,
    url: `${siteUrl}/${locale}`,
    image: data.profile?.avatar_url ?? undefined,
    address: data.profile?.location ?? undefined,
    sameAs: data.links.filter((l) => l.url.startsWith("http")).map((l) => l.url),
    knowsAbout: data.technologies.filter((t) => t.show_in_stack).map((t) => t.name),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }}
      />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero data={data} dict={dict} locale={locale} />
        <About data={data} dict={dict} locale={locale} />
        <Stack data={data} dict={dict} locale={locale} />
        <Projects data={data} dict={dict} locale={locale} />
        <Contact data={data} dict={dict} locale={locale} />
      </main>
      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 font-mono text-[11px] text-muted sm:flex-row sm:px-6">
          <span>
            © {data.stats.currentYear} {data.profile?.full_name}
          </span>
          <span>{dict.footer.built}</span>
        </div>
      </footer>
    </>
  );
}
