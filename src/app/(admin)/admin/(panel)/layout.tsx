import { Suspense } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "../actions";
import { LogOut } from "lucide-react";

const themeLabels = { label: "Tema", light: "Claro", dark: "Escuro" };

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-6 lg:p-5">
          <Link href="/admin" className="font-mono text-sm">
            <span className="text-accent">~/</span>admin
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle labels={themeLabels} />
          </div>
        </div>
        <AdminNav />
        <div className="hidden space-y-3 p-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <ThemeToggle labels={themeLabels} />
          <div className="flex items-center justify-between text-xs">
            <a href="/" target="_blank" className="text-muted hover:text-fg">
              Ver site ↗
            </a>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1 text-muted hover:text-red-500">
                <LogOut className="size-3.5" /> Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 lg:py-12">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
