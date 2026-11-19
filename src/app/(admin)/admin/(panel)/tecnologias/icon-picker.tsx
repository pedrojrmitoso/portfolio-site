"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Check, ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
import { uploadFile } from "@/components/admin/upload";
import { TechIcon, techIcons, type TechIconDef } from "@/lib/tech-icons";

export type IconMode = "catalog" | "upload" | "initial";

const ACCEPT = ["image/png", "image/webp", "image/avif", "image/jpeg"];
const MAX_BYTES = 1024 * 1024;

const modes: { key: IconMode; label: string }[] = [
  { key: "catalog", label: "Catálogo" },
  { key: "upload", label: "Imagem própria" },
  { key: "initial", label: "Só a inicial" },
];

const catalog = Object.entries(techIcons).sort((a, b) => a[1].label.localeCompare(b[1].label));

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Logo da tecnologia: um item do catálogo, uma imagem enviada ou a inicial do nome.
 * Os valores vão nos inputs `icon` e `icon_url` (só o do modo ativo é enviado).
 */
export function IconPicker({
  mode,
  onMode,
  icon,
  onPick,
  iconUrl,
  onUpload,
  name,
  color,
}: {
  mode: IconMode;
  onMode: (m: IconMode) => void;
  icon: string;
  onPick: (key: string, def: TechIconDef) => void;
  iconUrl: string;
  onUpload: (url: string) => void;
  name: string;
  color: string;
}) {
  return (
    <fieldset className="rounded-xl border border-line bg-bg/40">
      <legend className="sr-only">Logo</legend>
      <input type="hidden" name="icon" value={mode === "catalog" ? icon : ""} />
      <input type="hidden" name="icon_url" value={mode === "upload" ? iconUrl : ""} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <span className="text-xs font-medium text-muted">Logo</span>
        <div role="tablist" aria-label="Origem do logo" className="flex rounded-full bg-surface-2 p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => onMode(m.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-[background-color,color,box-shadow] ${
                mode === m.key
                  ? "bg-surface text-fg shadow-[0_1px_3px_rgba(11,21,48,0.15)]"
                  : "text-muted hover:text-fg"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        {mode === "catalog" && <CatalogGrid icon={icon} onPick={onPick} color={color} />}
        {mode === "upload" && <UploadPanel url={iconUrl} onUpload={onUpload} />}
        {mode === "initial" && (
          <div className="flex items-center gap-4 py-2">
            <span className="grid size-14 place-items-center rounded-xl border border-line bg-surface">
              <TechIcon icon={null} name={name || "?"} className="size-8" />
            </span>
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              Sem logo: o site mostra a inicial{" "}
              <span className="font-mono text-fg">“{(name || "?").slice(0, 1).toUpperCase()}”</span> na cor de
              destaque. Bom para ferramentas internas ou pouco conhecidas.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}

function CatalogGrid({
  icon,
  onPick,
  color,
}: {
  icon: string;
  onPick: (key: string, def: TechIconDef) => void;
  color: string;
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const q = normalize(query.trim());
    return q ? catalog.filter(([key, d]) => normalize(`${d.label} ${key}`).includes(q)) : catalog;
  }, [query]);

  return (
    <div>
      <label className="relative mb-3 flex items-center">
        <Search className="pointer-events-none absolute left-3 size-3.5 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder={`Buscar entre ${catalog.length} logos`}
          aria-label="Buscar no catálogo"
          className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-accent"
        />
      </label>

      {items.length ? (
        <ul
          role="listbox"
          aria-label="Catálogo de logos"
          className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-1.5 overflow-y-auto overscroll-contain pr-1"
        >
          {items.map(([key, def]) => {
            const active = key === icon;
            return (
              <li key={key} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => onPick(key, def)}
                  title={def.label}
                  className={`relative flex w-full flex-col items-center gap-1.5 rounded-lg border px-1 pt-2.5 pb-2 transition-[border-color,background-color,transform] active:scale-95 ${
                    active
                      ? "border-accent bg-accent/10"
                      : "border-transparent hover:border-line hover:bg-surface"
                  }`}
                >
                  <TechIcon
                    icon={key}
                    color={active ? color || null : null}
                    name={def.label}
                    className="size-6"
                  />
                  <span className="w-full truncate text-center text-[10.5px] leading-tight text-muted">
                    {def.label}
                  </span>
                  {active && (
                    <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-accent-solid text-white">
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-muted">
          Nada no catálogo para “{query}”. Use <span className="font-medium text-fg">Imagem própria</span>{" "}
          para enviar o logo.
        </p>
      )}
    </div>
  );
}

function UploadPanel({ url, onUpload }: { url: string; onUpload: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send(file?: File) {
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) return setError("Use PNG, WebP, AVIF ou JPG. SVG não é aceito.");
    if (file.size > MAX_BYTES) return setError("Imagem acima de 1 MB. Reduza e envie de novo.");
    setBusy(true);
    try {
      onUpload(await uploadFile(file, "media", "tech"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void send(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      {/* Prévia nos dois temas: logo escuro some no fundo escuro, e vice-versa */}
      <div className="flex gap-2" aria-label="Prévia nos temas claro e escuro">
        {[
          { label: "claro", bg: "bg-[#f4f6fb]", text: "text-[#5b6478]" },
          { label: "escuro", bg: "bg-[#0b1530]", text: "text-[#8d97ad]" },
        ].map((t) => (
          <figure key={t.label} className="flex flex-col items-center gap-1">
            <span className={`grid size-[4.5rem] place-items-center rounded-xl border border-line ${t.bg}`}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-10 object-contain" />
              ) : (
                <ImagePlus className={`size-5 ${t.text} opacity-60`} aria-hidden />
              )}
            </span>
            <figcaption className="font-mono text-[10px] text-muted">{t.label}</figcaption>
          </figure>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border border-dashed p-4 transition-colors ${
          dragging ? "border-accent bg-accent/8" : "border-line"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-solid px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {busy ? "Enviando…" : url ? "Trocar imagem" : "Enviar imagem"}
          </button>
          {url && !busy && (
            <button
              type="button"
              onClick={() => onUpload("")}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted hover:text-red-500"
            >
              <Trash2 className="size-3.5" /> Remover
            </button>
          )}
          <span className="text-xs text-muted">ou arraste o arquivo aqui</span>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted/90">
          PNG ou WebP quadrado, com fundo transparente, a partir de 128 px e até 1 MB. Confira na prévia se o
          logo aparece bem nos dois temas.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        hidden
        accept={ACCEPT.join(",")}
        onChange={(e) => void send(e.target.files?.[0])}
      />
    </div>
  );
}
