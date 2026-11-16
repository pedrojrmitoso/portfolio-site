"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Cpu, FolderKanban, Inbox, KeyRound, Link2, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/(admin)/admin/actions";

const items = [
  { href: "/admin", label: "Perfil", Icon: UserRound },
  { href: "/admin/projetos", label: "Projetos", Icon: FolderKanban },
  { href: "/admin/tecnologias", label: "Tecnologias", Icon: Cpu },
  { href: "/admin/links", label: "Links", Icon: Link2 },
  { href: "/admin/experiencia", label: "Experiência", Icon: Briefcase },
  { href: "/admin/mensagens", label: "Mensagens", Icon: Inbox },
  { href: "/admin/conta", label: "Conta", Icon: KeyRound },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
      <form action={signOut} className="shrink-0 lg:hidden">
        <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-red-500">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </form>
    </nav>
  );
}
