"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
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
import { deleteMessages, setMessagesRead } from "../../actions";

export type InboxMessage = {
  id: string;
  name: string;
  email: string;
  project_type: string;
  message: string;
  locale: string | null;
  read: boolean;
  created_at: string;
};

type Category = "all" | "bi" | "data" | "ai" | "other";

const TZ = "America/Sao_Paulo";
const UNDO_MS = 5000;

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
  return `mailto:${m.email}?subject=${encodeURIComponent("Re: seu contato pelo portfólio")}&body=${encodeURIComponent(body)}`;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const iconBtn =
  "grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40";

type Toast = { id: number; text: string; ok: boolean; undo?: () => void };

export function Inbox({ messages }: { messages: InboxMessage[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("m");

  const [readOverride, setReadOverride] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingDelete = useRef<{ ids: string[]; timer: ReturnType<typeof setTimeout> } | null>(null);

  const all = useMemo(
    () =>
      messages
        .filter((m) => !hidden.has(m.id))
        .map((m) => (m.id in readOverride ? { ...m, read: readOverride[m.id] } : m)),
    [messages, hidden, readOverride],
  );

  const unreadBy = useMemo(() => {
    const c: Record<Category, number> = { all: 0, bi: 0, data: 0, ai: 0, other: 0 };
    for (const m of all) {
      if (m.read) continue;
      c.all++;
      const k = (m.project_type in c ? m.project_type : "other") as Category;
      c[k]++;
    }
    return c;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (m) =>
        (category === "all" || m.project_type === category) &&
        (!unreadOnly || !m.read) &&
        (!q || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q)),
    );
  }, [all, category, unreadOnly, query]);

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
    const res = await deleteMessages(p.ids);
    if (res && !res.ok) {
      setHidden((h) => {
        const n = new Set(h);
        p.ids.forEach((id) => n.delete(id));
        return n;
      });
      report(res);
    }
  }, [report]);

  // Excluir como no Gmail: some na hora, e dá para desfazer por alguns segundos
  const remove = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      void flushDelete();
      setHidden((h) => new Set([...h, ...ids]));
      setSelected(new Set());
      const timer = setTimeout(() => void flushDelete(), UNDO_MS);
      pendingDelete.current = { ids, timer };
      notify({
        text: ids.length === 1 ? "Mensagem excluída" : `${ids.length} mensagens excluídas`,
        ok: true,
        undo: () => {
          const p = pendingDelete.current;
          if (!p) return;
          clearTimeout(p.timer);
          pendingDelete.current = null;
          setHidden((h) => {
            const n = new Set(h);
            p.ids.forEach((id) => n.delete(id));
            return n;
          });
          setToast(null);
        },
      });
    },
    [flushDelete, notify],
  );

  // Ao sair da página, conclui a exclusão pendente
  useEffect(() => () => void flushDelete(), [flushDelete]);

  const open = useCallback(
    (m: InboxMessage) => {
      window.history.pushState(null, "", `?m=${m.id}`);
      if (!m.read) void markRead([m.id], true, true);
    },
    [markRead],
  );

  const backToList = useCallback(() => {
    window.history.pushState(null, "", window.location.pathname);
  }, []);

  const go = useCallback(
    (delta: number) => {
      const next = visible[openedIndex + delta];
      if (next) {
        window.history.replaceState(null, "", `?m=${next.id}`);
        setCursor(openedIndex + delta);
        if (!next.read) void markRead([next.id], true, true);
      }
    },
    [visible, openedIndex, markRead],
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
          remove([opened.id]);
          backToList();
        } else if (e.key === "U") {
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
        else if (e.key === "#" && visibleSelected.length) remove(visibleSelected.map((m) => m.id));
        else return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, visible, safeCursor, visibleSelected, backToList, go, remove, markRead, open, toggle]);

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
            Caixa de entrada
            {unreadBy.all > 0 && (
              <span className="rounded-full bg-accent-solid px-2.5 py-0.5 font-mono text-xs font-medium text-white tabular-nums">
                {unreadBy.all}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">Mensagens do formulário de Contato do site.</p>
        </div>

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
            placeholder="Pesquisar mensagens"
            aria-label="Pesquisar mensagens"
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
            index={openedIndex}
            total={visible.length}
            onBack={backToList}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onUnread={() => {
              void markRead([opened.id], false);
              backToList();
            }}
            onDelete={() => {
              remove([opened.id]);
              backToList();
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

              {visibleSelected.length ? (
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
                    title="Excluir"
                    aria-label="Excluir selecionadas"
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
                <span className="hidden font-mono text-xs text-muted tabular-nums sm:inline">
                  {visible.length ? `1–${visible.length} de ${visible.length}` : "0"}
                </span>
              </div>
            </div>

            {/* ---------- abas por tipo de projeto ---------- */}
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

            {/* ---------- lista ---------- */}
            {visible.length ? (
              <ul role="list" aria-label={`Mensagens · ${activeCategory.label}`}>
                {visible.map((m, i) => (
                  <Row
                    key={m.id}
                    m={m}
                    selected={selected.has(m.id)}
                    cursor={i === safeCursor}
                    query={query.trim()}
                    onOpen={() => {
                      setCursor(i);
                      open(m);
                    }}
                    onToggle={() => toggle(m.id)}
                    onRead={() => void markRead([m.id], !m.read)}
                    onDelete={() => remove([m.id])}
                  />
                ))}
              </ul>
            ) : (
              <Empty
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
          <Shortcut k="#">excluir</Shortcut>
          <Shortcut k="/">pesquisar</Shortcut>
        </p>
      )}

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
  selected,
  cursor,
  query,
  onOpen,
  onToggle,
  onRead,
  onDelete,
}: {
  m: InboxMessage;
  selected: boolean;
  cursor: boolean;
  query: string;
  onOpen: () => void;
  onToggle: () => void;
  onRead: () => void;
  onDelete: () => void;
}) {
  const meta = metaOf(m.project_type);
  const snippet = m.message.replace(/\s+/g, " ").trim();
  const unread = !m.read;

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
          <time
            dateTime={m.created_at}
            suppressHydrationWarning
            className={`font-mono text-xs tabular-nums sm:group-hover:invisible ${unread ? "font-semibold text-fg" : "text-muted"}`}
          >
            {listDate(m.created_at)}
          </time>
          <div className="pointer-events-auto absolute right-[-0.5rem] hidden items-center sm:group-hover:flex">
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
              title="Excluir"
              aria-label="Excluir"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

// ---------- leitura ----------
function Reader({
  m,
  index,
  total,
  onBack,
  onPrev,
  onNext,
  onUnread,
  onDelete,
  onCopied,
}: {
  m: InboxMessage;
  index: number;
  total: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUnread: () => void;
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
          title="Excluir (#)"
          aria-label="Excluir"
        >
          <Trash2 className="size-[18px]" />
        </button>

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
function Empty({ filtered, query, onClear }: { filtered: boolean; query: string; onClear: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-muted">
        {filtered ? <Search className="size-7" aria-hidden /> : <InboxIcon className="size-7" aria-hidden />}
      </span>
      <p className="mt-4 font-display text-lg font-semibold">
        {filtered
          ? query
            ? `Nada encontrado para “${query}”`
            : "Nenhuma mensagem aqui"
          : "Caixa de entrada vazia"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "Tente outra busca ou limpe os filtros."
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
