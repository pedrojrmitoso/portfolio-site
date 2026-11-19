"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveRestore,
  ArrowLeft,
  BarChart3,
  Hourglass,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  MessageSquare,
  Reply,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ActionState } from "../../actions";
import { emptyTrash, purgeMessages, restoreMessages, setMessagesRead, trashMessages } from "../../actions";

export type InboxMessage = {
  id: string;
  name: string;
  email: string;
  project_type: string;
  message: string;
  locale: string | null;
  read: boolean;
  created_at: string;
  deleted_at: string | null;
};

type Category = "all" | "bi" | "data" | "ai" | "other";
type Folder = "inbox" | "trash";
/** Onde a mensagem está escondida até o servidor confirmar (ou "all" = apagada de vez). */
type HiddenIn = Folder | "all";

const TZ = "America/Sao_Paulo";
const UNDO_MS = 5000;
/** Igual ao pg_cron da migration 0008. */
const TRASH_DAYS = 30;
const DAY_MS = 864e5;

function purgeDate(deletedAt: string) {
  return new Date(new Date(deletedAt).getTime() + TRASH_DAYS * DAY_MS);
}

function daysLeft(deletedAt: string) {
  return Math.max(0, Math.ceil((purgeDate(deletedAt).getTime() - Date.now()) / DAY_MS));
}

type Confirm = { title: string; body: string; action: string; run: () => void };

const categories: { key: Category; label: string; Icon: typeof InboxIcon }[] = [
  { key: "all", label: "Todas", Icon: InboxIcon },
  { key: "bi", label: "Dashboard / BI", Icon: BarChart3 },
  { key: "data", label: "Dados", Icon: Database },
  { key: "ai", label: "IA / ML", Icon: Sparkles },
  { key: "other", label: "Outro", Icon: MessageSquare },
];

const typeMeta: Record<string, { label: string; chip: string; bar: string }> = {
  bi: { label: "Dashboard / BI", chip: "bg-accent/12 text-accent", bar: "bg-accent" },
  data: { label: "Dados", chip: "bg-accent-2/12 text-accent-2", bar: "bg-accent-2" },
  ai: {
    label: "IA / ML",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  other: { label: "Outro", chip: "bg-surface-2 text-muted", bar: "bg-muted" },
};
const metaOf = (t: string) => typeMeta[t] ?? typeMeta.other;

const avatarColors = [
  "bg-blue-600",
  "bg-teal-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
  "bg-emerald-700",
  "bg-sky-700",
  "bg-orange-600",
];

function avatarColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** Como no Gmail: hora se for hoje, "12 de nov." no mesmo ano, data curta nos anteriores. */
function listDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (dayKey(d) === dayKey(now)) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  }
  if (
    d.toLocaleDateString("en-CA", { year: "numeric", timeZone: TZ }) ===
    now.toLocaleDateString("en-CA", { year: "numeric", timeZone: TZ })
  ) {
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: TZ });
  }
  return d.toLocaleDateString("pt-BR", { dateStyle: "short", timeZone: TZ });
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
}

function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (diff < 60) return "agora há pouco";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return null;
}

function replyHref(m: InboxMessage) {
  const quoted = m.message
    .slice(0, 1200)
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const body = `\n\n\nEm ${fullDate(m.created_at)}, ${m.name} escreveu:\n${quoted}`;
  return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Re: seu contato pelo portfólio")}&body=${encodeURIComponent(body)}`;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const iconBtn =
  "grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40";

type Toast = { id: number; text: string; ok: boolean; undo?: () => void };

export function Inbox({ messages, trash }: { messages: InboxMessage[]; trash: InboxMessage[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("m");
  const folder: Folder = params.get("pasta") === "lixeira" ? "trash" : "inbox";
  const inTrash = folder === "trash";

  const [readOverride, setReadOverride] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, HiddenIn>>({});
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingDelete = useRef<{ ids: string[]; timer: ReturnType<typeof setTimeout> } | null>(null);

  const inboxAll = useMemo(
    () =>
      messages
        .filter((m) => hidden[m.id] !== "inbox" && hidden[m.id] !== "all")
        .map((m) => (m.id in readOverride ? { ...m, read: readOverride[m.id] } : m)),
    [messages, hidden, readOverride],
  );
  const trashAll = useMemo(
    () => trash.filter((m) => hidden[m.id] !== "trash" && hidden[m.id] !== "all"),
    [trash, hidden],
  );
  const all = inTrash ? trashAll : inboxAll;

  const hide = useCallback(
    (ids: string[], where: HiddenIn) =>
      setHidden((h) => ({ ...h, ...Object.fromEntries(ids.map((id) => [id, where])) })),
    [],
  );
  const unhide = useCallback(
    (ids: string[]) =>
      setHidden((h) => {
        const n = { ...h };
        ids.forEach((id) => delete n[id]);
        return n;
      }),
    [],
  );

  const unreadBy = useMemo(() => {
    const c: Record<Category, number> = { all: 0, bi: 0, data: 0, ai: 0, other: 0 };
    for (const m of inboxAll) {
      if (m.read) continue;
      c.all++;
      const k = (m.project_type in c ? m.project_type : "other") as Category;
      c[k]++;
    }
    return c;
  }, [inboxAll]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (m) =>
        (inTrash || category === "all" || m.project_type === category) &&
        (inTrash || !unreadOnly || !m.read) &&
        (!q || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q)),
    );
  }, [all, inTrash, category, unreadOnly, query]);

  const opened = openId ? all.find((m) => m.id === openId) : undefined;
  const openedIndex = opened ? visible.findIndex((m) => m.id === opened.id) : -1;
  const safeCursor = Math.min(cursor, Math.max(visible.length - 1, 0));

  const notify = useCallback((t: Omit<Toast, "id">) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? UNDO_MS : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const report = useCallback(
    (res: ActionState) => {
      if (res && !res.ok) notify({ text: res.message, ok: false });
    },
    [notify],
  );

  // ---------- ações ----------
  const markRead = useCallback(
    async (ids: string[], read: boolean, silent = false) => {
      if (!ids.length) return;
      setReadOverride((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, read])) }));
      const res = await setMessagesRead(ids, read);
      if (res && !res.ok) {
        setReadOverride((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, !read])) }));
        report(res);
      } else if (!silent && res) {
        notify({ text: res.message, ok: true });
      }
    },
    [notify, report],
  );

  const flushDelete = useCallback(async () => {
    const p = pendingDelete.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingDelete.current = null;
    const res = await trashMessages(p.ids);
    if (res && !res.ok) {
      unhide(p.ids);
      report(res);
    } else {
      router.refresh(); // a lixeira passa a mostrar as mensagens movidas
    }
  }, [report, unhide, router]);

  // Excluir como no Gmail: vai para a lixeira na hora, e dá para desfazer por alguns segundos
  const remove = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      void flushDelete();
      hide(ids, "inbox");
      setSelected(new Set());
      const timer = setTimeout(() => void flushDelete(), UNDO_MS);
      pendingDelete.current = { ids, timer };
      notify({
        text:
          ids.length === 1
            ? "Mensagem movida para a lixeira"
            : `${ids.length} mensagens movidas para a lixeira`,
        ok: true,
        undo: () => {
          const p = pendingDelete.current;
          if (!p) return;
          clearTimeout(p.timer);
          pendingDelete.current = null;
          unhide(p.ids);
          setToast(null);
        },
      });
    },
    [flushDelete, notify, hide, unhide],
  );

  const restore = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      hide(ids, "trash");
      setSelected(new Set());
      const res = await restoreMessages(ids);
      if (res && !res.ok) {
        unhide(ids);
        report(res);
      } else if (res) {
        notify({ text: res.message, ok: true });
        router.refresh();
      }
    },
    [hide, unhide, report, notify, router],
  );

  // Apagar de vez não tem volta: sempre pede confirmação
  const askPurge = useCallback(
    (ids: string[], after?: () => void) => {
      if (!ids.length) return;
      const n = ids.length;
      setConfirm({
        title: n === 1 ? "Apagar mensagem definitivamente?" : `Apagar ${n} mensagens definitivamente?`,
        body: "Não dá para desfazer. A mensagem some do painel e do banco de dados.",
        action: "Apagar definitivamente",
        run: async () => {
          after?.();
          hide(ids, "all");
          setSelected(new Set());
          const res = await purgeMessages(ids);
          if (res && !res.ok) {
            unhide(ids);
            report(res);
          } else if (res) {
            notify({ text: res.message, ok: true });
            router.refresh();
          }
        },
      });
    },
    [hide, unhide, report, notify, router],
  );

  const askEmpty = useCallback(() => {
    const ids = trashAll.map((m) => m.id);
    if (!ids.length) return;
    setConfirm({
      title: "Esvaziar a lixeira?",
      body: `${ids.length === 1 ? "A mensagem da lixeira será apagada" : `As ${ids.length} mensagens da lixeira serão apagadas`} definitivamente. Não dá para desfazer.`,
      action: "Esvaziar lixeira",
      run: async () => {
        hide(ids, "all");
        const res = await emptyTrash();
        if (res && !res.ok) {
          unhide(ids);
          report(res);
        } else if (res) {
          notify({ text: res.message, ok: true });
          router.refresh();
        }
      },
    });
  }, [trashAll, hide, unhide, report, notify, router]);

  /** Lixeira na caixa de entrada; apagar de vez dentro da lixeira. */
  const discard = inTrash ? askPurge : remove;

  const urlFor = useCallback((f: Folder, m?: string) => {
    const q = new URLSearchParams();
    if (f === "trash") q.set("pasta", "lixeira");
    if (m) q.set("m", m);
    const s = q.toString();
    return s ? `?${s}` : window.location.pathname;
  }, []);

  const switchFolder = useCallback(
    (f: Folder) => {
      window.history.pushState(null, "", urlFor(f));
      setSelected(new Set());
      setCursor(0);
      setQuery("");
    },
    [urlFor],
  );

  // Ao sair da página, conclui a exclusão pendente
  useEffect(() => () => void flushDelete(), [flushDelete]);

  const open = useCallback(
    (m: InboxMessage) => {
      window.history.pushState(null, "", urlFor(folder, m.id));
      if (!m.read && !inTrash) void markRead([m.id], true, true);
    },
    [markRead, urlFor, folder, inTrash],
  );

  const backToList = useCallback(() => {
    window.history.pushState(null, "", urlFor(folder));
  }, [urlFor, folder]);

  const go = useCallback(
    (delta: number) => {
      const next = visible[openedIndex + delta];
      if (next) {
        window.history.replaceState(null, "", urlFor(folder, next.id));
        setCursor(openedIndex + delta);
        if (!next.read && !inTrash) void markRead([next.id], true, true);
      }
    },
    [visible, openedIndex, markRead, urlFor, folder, inTrash],
  );

  const toggle = useCallback(
    (id: string) =>
      setSelected((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );

  const visibleSelected = visible.filter((m) => selected.has(m.id));
  const allChecked = visible.length > 0 && visibleSelected.length === visible.length;
  const someChecked = visibleSelected.length > 0 && !allChecked;
  const masterRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = someChecked;
  }, [someChecked]);

  // ---------- atalhos de teclado (como no Gmail) ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (opened) {
        if (e.key === "u" || e.key === "Escape") backToList();
        else if (e.key === "j" || e.key === "ArrowRight") go(1);
        else if (e.key === "k" || e.key === "ArrowLeft") go(-1);
        else if (e.key === "#") {
          if (inTrash) askPurge([opened.id], backToList);
          else {
            remove([opened.id]);
            backToList();
          }
        } else if (e.key === "U" && !inTrash) {
          void markRead([opened.id], false);
          backToList();
        } else if (e.key === "r") window.location.href = replyHref(opened);
        else return;
      } else {
        const current = visible[safeCursor];
        if (e.key === "/") searchRef.current?.focus();
        else if (e.key === "j" || e.key === "ArrowDown")
          setCursor(Math.min(safeCursor + 1, visible.length - 1));
        else if (e.key === "k" || e.key === "ArrowUp") setCursor(Math.max(safeCursor - 1, 0));
        else if ((e.key === "o" || e.key === "Enter") && current) open(current);
        else if (e.key === "x" && current) toggle(current.id);
        else if (e.key === "#" && visibleSelected.length) discard(visibleSelected.map((m) => m.id));
        else return;
      }
      e.preventDefault();
    }
    // Com a confirmação aberta, o teclado é dela
    if (confirm) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    opened,
    visible,
    safeCursor,
    visibleSelected,
    backToList,
    go,
    remove,
    discard,
    askPurge,
    inTrash,
    confirm,
    markRead,
    open,
    toggle,
  ]);

  // Mantém a linha do cursor visível
  useEffect(() => {
    if (opened) return;
    document.getElementById(`row-${visible[safeCursor]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [safeCursor, visible, opened]);

  const refresh = () => startRefresh(() => router.refresh());
  const activeCategory = categories.find((c) => c.key === category)!;

  return (
    <div className="relative">
      {/* ---------- topo: título + busca ---------- */}
      <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="mr-auto">
          <h1 className="flex items-center gap-3 font-display text-3xl font-semibold tracking-tight">
            {inTrash ? "Lixeira" : "Caixa de entrada"}
            {!inTrash && unreadBy.all > 0 && (
              <span className="rounded-full bg-accent-solid px-2.5 py-0.5 font-mono text-xs font-medium text-white tabular-nums">
                {unreadBy.all}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {inTrash
              ? `Mensagens excluídas ficam aqui por ${TRASH_DAYS} dias.`
              : "Mensagens do formulário de Contato do site."}
          </p>
        </div>

        <nav aria-label="Pastas" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {(
            [
              { key: "inbox", label: "Entrada", Icon: InboxIcon, count: unreadBy.all },
              { key: "trash", label: "Lixeira", Icon: Trash2, count: trashAll.length },
            ] as const
          ).map(({ key, label, Icon, count }) => {
            const active = folder === key;
            return (
              <button
                key={key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => !active && switchFolder(key)}
                className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm transition-colors sm:flex-none ${
                  active
                    ? "bg-accent/12 font-semibold text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-px font-mono text-[10px] tabular-nums ${
                      active ? "bg-accent-solid text-white" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <label className="group relative flex w-full items-center sm:w-80">
          <Search className="pointer-events-none absolute left-4 size-4 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder={inTrash ? "Pesquisar na lixeira" : "Pesquisar mensagens"}
            aria-label={inTrash ? "Pesquisar na lixeira" : "Pesquisar mensagens"}
            className="h-11 w-full rounded-full border border-transparent bg-surface-2 pr-16 pl-11 text-sm transition-[background-color,border-color,box-shadow] outline-none placeholder:text-muted/80 focus:border-line focus:bg-surface focus:shadow-[0_2px_10px_-2px_rgba(11,21,48,0.18)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 rounded border border-line px-1.5 font-mono text-[10px] text-muted">
              /
            </kbd>
          )}
        </label>
      </header>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,21,48,0.04)]">
        {opened ? (
          <Reader
            m={opened}
            trash={inTrash}
            index={openedIndex}
            total={visible.length}
            onBack={backToList}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onUnread={() => {
              void markRead([opened.id], false);
              backToList();
            }}
            onRestore={() => {
              void restore([opened.id]);
              backToList();
            }}
            onDelete={() => {
              if (inTrash) askPurge([opened.id], backToList);
              else {
                remove([opened.id]);
                backToList();
              }
            }}
            onCopied={() => notify({ text: "E-mail copiado", ok: true })}
          />
        ) : (
          <>
            {/* ---------- barra de ferramentas ---------- */}
            <div className="flex h-12 items-center gap-1 border-b border-line px-2 sm:px-3">
              <label className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-surface-2">
                <input
                  ref={masterRef}
                  type="checkbox"
                  checked={allChecked}
                  disabled={!visible.length}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(visible.map((m) => m.id)))}
                  aria-label="Selecionar todas"
                  className="size-4 cursor-pointer accent-[var(--accent-solid)]"
                />
              </label>

              {visibleSelected.length && inTrash ? (
                <>
                  <span className="mr-1 ml-1 font-mono text-xs text-muted tabular-nums">
                    {visibleSelected.length} selecionada{visibleSelected.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className={iconBtn}
                    title="Restaurar"
                    aria-label="Restaurar selecionadas"
                    onClick={() => void restore(visibleSelected.map((m) => m.id))}
                  >
                    <ArchiveRestore className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={`${iconBtn} hover:text-red-500`}
                    title="Apagar definitivamente"
                    aria-label="Apagar selecionadas definitivamente"
                    onClick={() => askPurge(visibleSelected.map((m) => m.id))}
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </>
              ) : visibleSelected.length ? (
                <>
                  <span className="mr-1 ml-1 font-mono text-xs text-muted tabular-nums">
                    {visibleSelected.length} selecionada{visibleSelected.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className={iconBtn}
                    title="Marcar como lida"
                    aria-label="Marcar como lida"
                    onClick={() => {
                      void markRead(
                        visibleSelected.map((m) => m.id),
                        true,
                      );
                      setSelected(new Set());
                    }}
                  >
                    <MailOpen className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    title="Marcar como não lida"
                    aria-label="Marcar como não lida"
                    onClick={() => {
                      void markRead(
                        visibleSelected.map((m) => m.id),
                        false,
                      );
                      setSelected(new Set());
                    }}
                  >
                    <Mail className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={`${iconBtn} hover:text-red-500`}
                    title="Mover para a lixeira"
                    aria-label="Mover selecionadas para a lixeira"
                    onClick={() => remove(visibleSelected.map((m) => m.id))}
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={iconBtn}
                  title="Atualizar"
                  aria-label="Atualizar"
                  onClick={refresh}
                >
                  <RotateCw className={`size-[18px] ${refreshing ? "animate-spin" : ""}`} />
                </button>
              )}

              <div className="ml-auto flex items-center gap-3">
                {inTrash ? (
                  <button
                    type="button"
                    onClick={askEmpty}
                    disabled={!trashAll.length}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Esvaziar lixeira
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-pressed={unreadOnly}
                    onClick={() => {
                      setUnreadOnly((v) => !v);
                      setCursor(0);
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                      unreadOnly
                        ? "border-accent/40 bg-accent/12 text-accent"
                        : "border-line text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    {unreadOnly && <Check className="size-3.5" aria-hidden />}
                    Não lidas
                  </button>
                )}
                <span className="hidden font-mono text-xs text-muted tabular-nums sm:inline">
                  {visible.length ? `1–${visible.length} de ${visible.length}` : "0"}
                </span>
              </div>
            </div>

            {/* ---------- lixeira: aviso do prazo | entrada: abas por tipo ---------- */}
            {inTrash ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-amber-500/[0.07] px-4 py-2.5 text-[13px] text-fg/85">
                <Hourglass className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  Mensagens na lixeira há mais de {TRASH_DAYS} dias são apagadas definitivamente.
                </span>
              </div>
            ) : (
              <div
                role="tablist"
                aria-label="Tipo de projeto"
                className="flex overflow-x-auto border-b border-line"
              >
                {categories.map(({ key, label, Icon }) => {
                  const active = key === category;
                  const count = unreadBy[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setCategory(key);
                        setCursor(0);
                        setSelected(new Set());
                      }}
                      className={`group relative flex h-12 min-w-fit flex-1 items-center gap-2.5 px-4 text-sm whitespace-nowrap transition-colors sm:max-w-56 ${
                        active ? "text-accent" : "text-muted hover:bg-surface-2/70 hover:text-fg"
                      }`}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                      <span className={active ? "font-semibold" : ""}>{label}</span>
                      {count > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-px font-mono text-[10px] tabular-nums ${
                            active ? "bg-accent-solid text-white" : "bg-surface-2 text-muted"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      <span
                        className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-accent transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* ---------- lista ---------- */}
            {visible.length ? (
              <ul role="list" aria-label={`Mensagens · ${activeCategory.label}`}>
                {visible.map((m, i) => (
                  <Row
                    key={m.id}
                    m={m}
                    trash={inTrash}
                    selected={selected.has(m.id)}
                    cursor={i === safeCursor}
                    query={query.trim()}
                    onOpen={() => {
                      setCursor(i);
                      open(m);
                    }}
                    onToggle={() => toggle(m.id)}
                    onRead={() => void markRead([m.id], !m.read)}
                    onRestore={() => void restore([m.id])}
                    onDelete={() => discard([m.id])}
                  />
                ))}
              </ul>
            ) : (
              <Empty
                trash={inTrash}
                filtered={all.length > 0}
                query={query.trim()}
                onClear={() => {
                  setQuery("");
                  setUnreadOnly(false);
                  setCategory("all");
                }}
              />
            )}
          </>
        )}
      </div>

      {!opened && visible.length > 0 && (
        <p className="mt-4 hidden flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted lg:flex">
          <Shortcut k="j / k">navegar</Shortcut>
          <Shortcut k="o">abrir</Shortcut>
          <Shortcut k="x">selecionar</Shortcut>
          <Shortcut k="#">{inTrash ? "apagar definitivamente" : "mover para a lixeira"}</Shortcut>
          <Shortcut k="/">pesquisar</Shortcut>
        </p>
      )}

      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />

      {/* ---------- aviso (snackbar) ---------- */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center lg:left-[calc(15rem+1.5rem)] lg:justify-start"
      >
        {toast && (
          <div
            key={toast.id}
            className="toast-in pointer-events-auto flex min-h-12 items-center gap-4 rounded-lg bg-[#1d2740] py-2 pr-2 pl-4 text-sm text-white shadow-[0_8px_30px_-6px_rgba(0,0,0,0.45)] dark:bg-[#e6ecfa] dark:text-[#0b1530]"
          >
            {!toast.ok && <X className="size-4 text-red-400 dark:text-red-600" aria-hidden />}
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={toast.undo}
                className="rounded-md px-3 py-1.5 font-medium text-[#8ab4ff] hover:bg-white/10 dark:text-accent-solid dark:hover:bg-black/5"
              >
                Desfazer
              </button>
            )}
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setToast(null)}
              className="grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 dark:text-black/50 dark:hover:bg-black/5"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- linha da lista ----------
function Row({
  m,
  trash,
  selected,
  cursor,
  query,
  onOpen,
  onToggle,
  onRead,
  onRestore,
  onDelete,
}: {
  m: InboxMessage;
  trash: boolean;
  selected: boolean;
  cursor: boolean;
  query: string;
  onOpen: () => void;
  onToggle: () => void;
  onRead: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const meta = metaOf(m.project_type);
  const snippet = m.message.replace(/\s+/g, " ").trim();
  // Na lixeira, tudo aparece como lido: o destaque vai para o prazo
  const unread = !m.read && !trash;

  return (
    <li
      id={`row-${m.id}`}
      className={`group relative border-b border-line/70 transition-colors last:border-b-0 ${
        selected
          ? "bg-accent/10"
          : unread
            ? "bg-surface hover:bg-surface-2/60"
            : "bg-surface-2/35 hover:bg-surface-2/80"
      } hover:z-10 hover:shadow-[inset_1px_0_0_var(--line),inset_-1px_0_0_var(--line),0_1px_2px_0_rgba(11,21,48,0.12),0_1px_3px_1px_rgba(11,21,48,0.06)]`}
    >
      {/* cursor do teclado */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${cursor ? "bg-accent" : unread ? meta.bar + " opacity-60" : "bg-transparent"}`}
      />

      {/* área clicável inteira (os controles ficam por cima) */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir mensagem de ${m.name}${unread ? " (não lida)" : ""}`}
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      />

      <div className="pointer-events-none relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-3 pr-4 pl-3 sm:h-[52px] sm:grid-cols-[auto_minmax(0,12rem)_minmax(0,1fr)_auto] sm:py-0 sm:pl-2">
        {/* avatar = caixa de seleção (como no Gmail mobile) */}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? `Desmarcar ${m.name}` : `Selecionar ${m.name}`}
          className="pointer-events-auto relative grid size-9 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-accent sm:size-8"
        >
          <span
            className={`absolute inset-0 grid place-items-center rounded-full text-xs font-semibold text-white transition-transform duration-200 [backface-visibility:hidden] ${avatarColor(m.email)} ${
              selected ? "[transform:rotateY(180deg)]" : "sm:group-hover:[transform:rotateY(180deg)]"
            }`}
          >
            {initials(m.name)}
          </span>
          <span
            className={`absolute inset-0 grid place-items-center rounded-full transition-transform duration-200 [backface-visibility:hidden] ${
              selected
                ? "[transform:rotateY(0deg)] bg-accent-solid text-white"
                : "[transform:rotateY(-180deg)] border-2 border-muted/50 bg-surface text-transparent sm:group-hover:[transform:rotateY(0deg)]"
            }`}
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        </button>

        {/* remetente (no mobile, nome + data na 1ª linha; prévia embaixo) */}
        <div className="min-w-0 sm:contents">
          <p className={`truncate text-sm ${unread ? "font-semibold text-fg" : "text-fg/80"}`}>
            <Highlight text={m.name} query={query} />
          </p>
          {/* mobile: etiqueta + prévia em até 2 linhas; desktop: uma linha só */}
          <p
            className={`mt-1 line-clamp-2 min-w-0 text-[13px] leading-snug sm:mt-0 sm:line-clamp-none sm:flex sm:items-center sm:gap-2 sm:text-sm ${
              unread ? "text-fg" : "text-muted"
            }`}
          >
            <span
              className={`mr-1.5 inline-block rounded px-1.5 py-px align-[1px] text-[11px] leading-4 font-medium sm:mr-0 sm:shrink-0 ${meta.chip}`}
            >
              {meta.label}
            </span>
            <span className="sm:truncate">
              <Highlight text={snippet} query={query} />
            </span>
          </p>
        </div>

        {/* data ↔ ações rápidas ao passar o mouse */}
        <div className="relative flex h-9 min-w-[3.5rem] items-center justify-end self-start sm:self-center">
          {trash && m.deleted_at ? (
            <Countdown deletedAt={m.deleted_at} />
          ) : (
            <time
              dateTime={m.created_at}
              suppressHydrationWarning
              className={`font-mono text-xs tabular-nums sm:group-hover:invisible ${unread ? "font-semibold text-fg" : "text-muted"}`}
            >
              {listDate(m.created_at)}
            </time>
          )}
          <div className="pointer-events-auto absolute right-[-0.5rem] hidden items-center sm:group-hover:flex">
            {trash ? (
              <>
                <button
                  type="button"
                  onClick={onRestore}
                  className={iconBtn}
                  title="Restaurar para a caixa de entrada"
                  aria-label="Restaurar"
                >
                  <ArchiveRestore className="size-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className={`${iconBtn} hover:text-red-500`}
                  title="Apagar definitivamente"
                  aria-label="Apagar definitivamente"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onRead}
                  className={iconBtn}
                  title={unread ? "Marcar como lida" : "Marcar como não lida"}
                  aria-label={unread ? "Marcar como lida" : "Marcar como não lida"}
                >
                  {unread ? <MailOpen className="size-[18px]" /> : <Mail className="size-[18px]" />}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className={`${iconBtn} hover:text-red-500`}
                  title="Mover para a lixeira"
                  aria-label="Mover para a lixeira"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Prazo até a limpeza automática: dias restantes + um filete que esvazia.
 * Âmbar na última semana, vermelho nos últimos 3 dias.
 */
function Countdown({ deletedAt }: { deletedAt: string }) {
  const left = daysLeft(deletedAt);
  const ratio = Math.min(1, left / TRASH_DAYS);
  const tone =
    left <= 3
      ? { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" }
      : left <= 7
        ? { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" }
        : { text: "text-muted", bar: "bg-muted/60" };
  const when = purgeDate(deletedAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });

  return (
    <span
      className="flex flex-col items-end gap-1 sm:group-hover:invisible"
      title={`Apagada definitivamente em ${when}`}
      suppressHydrationWarning
    >
      <span className={`font-mono text-xs tabular-nums ${tone.text}`} suppressHydrationWarning>
        {left === 0 ? "hoje" : left === 1 ? "1 dia" : `${left} dias`}
      </span>
      <span aria-hidden className="h-[3px] w-12 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.max(ratio * 100, 4)}%` }}
        />
      </span>
    </span>
  );
}

// ---------- leitura ----------
function Reader({
  m,
  trash,
  index,
  total,
  onBack,
  onPrev,
  onNext,
  onUnread,
  onRestore,
  onDelete,
  onCopied,
}: {
  m: InboxMessage;
  trash: boolean;
  index: number;
  total: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUnread: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onCopied: () => void;
}) {
  const meta = metaOf(m.project_type);
  const ago = relative(m.created_at);

  return (
    <article className="reader-in">
      <div className="flex h-12 items-center gap-1 border-b border-line px-2 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className={iconBtn}
          title="Voltar (u)"
          aria-label="Voltar para a lista"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        {trash ? (
          <>
            <button
              type="button"
              onClick={onRestore}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <ArchiveRestore className="size-[18px]" aria-hidden /> Restaurar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition-colors hover:bg-red-500/8 hover:text-red-600 dark:hover:text-red-400"
              title="Apagar definitivamente (#)"
            >
              <Trash2 className="size-[18px]" aria-hidden />
              <span className="hidden sm:inline">Apagar definitivamente</span>
              <span className="sm:hidden">Apagar</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onUnread}
              className={iconBtn}
              title="Marcar como não lida"
              aria-label="Marcar como não lida"
            >
              <Mail className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`${iconBtn} hover:text-red-500`}
              title="Mover para a lixeira (#)"
              aria-label="Mover para a lixeira"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {index >= 0 && (
            <span className="mr-1 font-mono text-xs text-muted tabular-nums">
              {index + 1} de {total}
            </span>
          )}
          <button
            type="button"
            onClick={onPrev}
            disabled={index <= 0}
            className={iconBtn}
            title="Mais recente (k)"
            aria-label="Mensagem mais recente"
          >
            <ChevronLeft className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index < 0 || index >= total - 1}
            className={iconBtn}
            title="Mais antiga (j)"
            aria-label="Mensagem mais antiga"
          >
            <ChevronRight className="size-[18px]" />
          </button>
        </div>
      </div>

      {trash && m.deleted_at && (
        <p
          className="flex items-center gap-2 border-b border-line bg-amber-500/[0.07] px-5 py-2.5 text-[13px] text-fg/85 sm:px-10"
          suppressHydrationWarning
        >
          <Hourglass className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          Na lixeira. Será apagada definitivamente em{" "}
          {purgeDate(m.deleted_at).toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: TZ })}.
        </p>
      )}

      <div className="px-5 pt-6 pb-8 sm:px-10 sm:pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
            Contato pelo portfólio
          </h2>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${meta.chip}`}>{meta.label}</span>
        </div>

        <div className="mt-6 flex items-start gap-3.5">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${avatarColor(m.email)}`}
          >
            {initials(m.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 text-sm">
                <span className="font-semibold">{m.name}</span>{" "}
                <span className="break-all text-muted">&lt;{m.email}&gt;</span>
              </p>
              <p className="font-mono text-xs text-muted" suppressHydrationWarning>
                {fullDate(m.created_at)}
                {ago && <span className="hidden sm:inline"> ({ago})</span>}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              para mim
              {m.locale && (
                <>
                  {" · "}site em <span className="font-mono">{m.locale.toUpperCase()}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 max-w-prose text-[15px] leading-relaxed break-words whitespace-pre-wrap sm:pl-[3.375rem]">
          {m.message}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 sm:pl-[3.375rem]">
          <a
            href={replyHref(m)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:border-accent hover:bg-accent/5"
          >
            <Reply className="size-4" aria-hidden /> Responder
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(m.email).then(onCopied, () => {})}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:border-accent hover:bg-accent/5"
          >
            <Copy className="size-4" aria-hidden /> Copiar e-mail
          </button>
        </div>
      </div>
    </article>
  );
}

// ---------- vazio ----------
function Empty({
  trash,
  filtered,
  query,
  onClear,
}: {
  trash: boolean;
  filtered: boolean;
  query: string;
  onClear: () => void;
}) {
  const EmptyIcon = filtered ? Search : trash ? Trash2 : InboxIcon;
  return (
    <div className="grid place-items-center px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-muted">
        <EmptyIcon className="size-7" aria-hidden />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">
        {filtered
          ? query
            ? `Nada encontrado para “${query}”`
            : "Nenhuma mensagem aqui"
          : trash
            ? "Lixeira vazia"
            : "Caixa de entrada vazia"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "Tente outra busca ou limpe os filtros."
          : trash
            ? `Mensagens excluídas ficam aqui por ${TRASH_DAYS} dias. Dá para restaurar até lá.`
            : "Quando alguém preencher o formulário de Contato do site, a mensagem aparece aqui."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-accent"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

// ---------- confirmação (apagar de vez) ----------
function ConfirmDialog({ confirm, onClose }: { confirm: Confirm | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[0_24px_64px_-16px_rgba(11,21,48,0.45)] backdrop:bg-[#0b1530]/45 backdrop:backdrop-blur-[2px]"
    >
      {confirm && (
        <div className="p-6">
          <span className="grid size-11 place-items-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <Trash2 className="size-5" aria-hidden />
          </span>
          <h2 id="confirm-title" className="mt-4 font-display text-lg font-semibold tracking-tight">
            {confirm.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{confirm.body}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="h-10 rounded-full border border-line px-5 text-sm font-medium hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const run = confirm.run;
                onClose();
                run();
              }}
              className="h-10 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              {confirm.action}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-300/60 px-px text-inherit dark:bg-amber-400/30">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

function Shortcut({ k, children }: { k: string; children: string }) {
  return (
    <span>
      <kbd className="rounded border border-line bg-surface px-1.5 py-px text-fg">{k}</kbd> {children}
    </span>
  );
}
