"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus } from "lucide-react";
import type { ActionState } from "@/app/(admin)/admin/actions";
import { Status } from "./ui";
import { btn } from "./styles";

type Item = { id: string; sort_order: number };

export type EditorProps = {
  onDone: (state: ActionState) => void;
  onCancel: () => void;
};

/** Selo discreto exibido à direita do resumo de um item. */
export function Badge({ children, dashed }: { children: ReactNode; dashed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap text-muted ${
        dashed ? "border border-dashed border-line" : "bg-surface-2"
      }`}
    >
      {children}
    </span>
  );
}

/** Título + subtítulo de uma linha (o padrão de todas as listas). */
export function RowText({
  title,
  subtitle,
  mono,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  mono?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium group-hover:text-accent">{title}</span>
      {subtitle && (
        <span className={`block truncate text-xs text-muted ${mono ? "font-mono" : ""}`}>{subtitle}</span>
      )}
    </span>
  );
}

const iconCls = "grid size-8 shrink-0 place-items-center rounded-full text-muted transition";

function Row({
  id,
  label,
  position,
  summary,
  href,
  open = false,
  onToggle,
  editor,
  dragDisabled = false,
}: {
  id: string;
  label: string;
  position: number;
  summary: ReactNode;
  /** Modo link: a linha leva à página de edição do item. */
  href?: string;
  open?: boolean;
  onToggle?: () => void;
  editor?: ReactNode;
  /** Editor aberto ou ordem sendo salva: sem arrastar (não perde edições nem corre). */
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: dragDisabled });
  const editorId = `editor-${id}`;
  const bodyCls = "group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 text-left";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-2xl border bg-surface transition-[border-color,box-shadow] ${
        isDragging
          ? "z-10 border-accent shadow-2xl shadow-black/20"
          : open
            ? "border-accent/60 shadow-lg shadow-black/5"
            : "border-line hover:border-muted/40"
      }`}
    >
      <div className="flex items-center gap-1.5 p-1.5 pr-2 sm:gap-2.5">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          aria-label={`Arrastar para reordenar: ${label}`}
          title={dragDisabled ? "Feche a edição para reordenar" : undefined}
          className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <GripVertical className="size-5" />
        </button>

        <span className="w-6 shrink-0 text-center font-mono text-xs text-muted tabular-nums">{position}</span>

        {href ? (
          <Link href={href} className={bodyCls}>
            {summary}
            <span className={`${iconCls} group-hover:bg-surface-2 group-hover:text-fg`} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={editorId}
            className={bodyCls}
          >
            {summary}
            <span
              className={`${iconCls} group-hover:bg-surface-2 group-hover:text-fg ${
                open ? "rotate-180 bg-surface-2 text-fg" : ""
              }`}
              aria-hidden
            >
              <ChevronDown className="size-4" />
            </span>
            <span className="sr-only">{open ? "Fechar edição" : "Editar"}</span>
          </button>
        )}
      </div>

      {open && editor && (
        <div id={editorId} className="border-t border-line">
          {editor}
        </div>
      )}
    </li>
  );
}

type Mode<T> =
  | {
      /** Edição inline: formulário do item (ou de um novo, quando `item` é undefined). */
      renderEditor: (item: T | undefined, props: EditorProps & { nextOrder: number }) => ReactNode;
      getHref?: never;
      addHref?: never;
    }
  | {
      /** Modo link: cada item tem página própria de edição. */
      getHref: (item: T) => string;
      addHref: string;
      renderEditor?: never;
    };

/**
 * Lista padrão do painel: arraste pelo ⠿ para reordenar (salva ao soltar, desfaz se falhar).
 * Clicar numa linha abre a edição inline, ou vai para a página do item no modo link.
 */
export function SortableList<T extends Item>({
  items,
  reorder,
  noun,
  itemLabel,
  renderSummary,
  ...mode
}: {
  items: T[];
  reorder: (ids: string[]) => Promise<ActionState>;
  noun: { one: string; many: string; add: string; empty: string };
  itemLabel: (item: T) => string;
  /** Conteúdo da linha (ícone, RowText, selos). Fica dentro de um botão/link: nada interativo. */
  renderSummary: (item: T) => ReactNode;
} & Mode<T>) {
  const byId = new Map(items.map((t) => [t.id, t]));
  const serverIds = items.map((t) => t.id);
  const serverKey = serverIds.join();

  const [order, setOrder] = useState(serverIds);
  const [syncedKey, setSyncedKey] = useState(serverKey);
  // Adicionou/excluiu no servidor: volta para a ordem que veio do banco
  if (syncedKey !== serverKey) {
    setSyncedKey(serverKey);
    setOrder(serverIds);
  }

  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  const rows = order.map((id) => byId.get(id)).filter((t): t is T => !!t);
  const nextOrder = Math.max(0, ...items.map((t) => t.sort_order)) + 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    startTransition(async () => {
      const result = await reorder(next);
      if (!result?.ok) setOrder(previous); // desfaz se não salvar
      setState(result);
    });
  }

  function done(result: ActionState) {
    setState(result);
    if (result?.ok) {
      setOpenId(null);
      setCreating(false);
    }
  }

  const addLabel = (
    <>
      <Plus className="size-4" aria-hidden /> {noun.add}
    </>
  );

  return (
    <>
      <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-6 items-center gap-3 text-sm">
          {pending ? <span className="text-muted">Salvando ordem…</span> : <Status state={state} />}
          {!pending && !state && (
            <span className="font-mono text-xs text-muted">
              {items.length} {items.length === 1 ? noun.one : noun.many}
            </span>
          )}
        </div>
        {mode.addHref ? (
          <Link href={mode.addHref} className={btn("primary")}>
            {addLabel}
          </Link>
        ) : (
          !creating && (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setOpenId(null);
                setState(null);
              }}
              className={btn("primary")}
            >
              {addLabel}
            </button>
          )
        )}
      </div>

      {creating && mode.renderEditor && (
        <section
          aria-label={noun.add}
          className="mb-4 rounded-2xl border border-dashed border-accent/60 bg-surface"
        >
          <p className="px-4 pt-4 text-sm font-medium sm:px-5">{noun.add}</p>
          {mode.renderEditor(undefined, { onDone: done, nextOrder, onCancel: () => setCreating(false) })}
        </section>
      )}

      {!rows.length ? (
        !creating && (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
            {noun.empty}
          </p>
        )
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Para reordenar, pressione espaço ou Enter, use as setas para mover e espaço ou Enter para soltar. Esc cancela.",
            },
          }}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {rows.map((t, i) => {
                const common = {
                  id: t.id,
                  label: itemLabel(t),
                  position: i + 1,
                  summary: renderSummary(t),
                  dragDisabled: pending || openId !== null || creating,
                };
                if (mode.getHref) return <Row key={t.id} {...common} href={mode.getHref(t)} />;

                const open = openId === t.id;
                const toggle = () => {
                  setOpenId((cur) => (cur === t.id ? null : t.id));
                  setCreating(false);
                };
                return (
                  <Row
                    key={t.id}
                    {...common}
                    open={open}
                    onToggle={toggle}
                    editor={open && mode.renderEditor(t, { onDone: done, nextOrder, onCancel: toggle })}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
