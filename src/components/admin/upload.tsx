"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { inputCls } from "./ui";

type Bucket = "media" | "resume";

function slugify(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "bin";
  return `${base || "arquivo"}.${ext}`;
}

/** Envia direto do navegador para o Supabase Storage (RLS: só admin). */
async function uploadFile(file: File, bucket: Bucket, folder: string) {
  const supabase = getBrowserClient();
  const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Campo de URL com botão de upload (imagem ou PDF). Valor vai no input `name`. */
export function UploadField({
  name,
  label,
  defaultValue,
  bucket = "media",
  folder,
  kind = "image",
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  bucket?: Bucket;
  folder: string;
  kind?: "image" | "pdf";
  hint?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadFile(file, bucket, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-start gap-3">
        {kind === "image" ? (
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-bg">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-5 text-muted" aria-hidden />
            )}
          </div>
        ) : (
          <a
            href={url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`grid size-16 shrink-0 place-items-center rounded-lg border border-line bg-bg ${url ? "text-accent" : "pointer-events-none text-muted"}`}
            aria-label="Abrir PDF"
          >
            <FileText className="size-6" aria-hidden />
          </a>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input
            name={name}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… ou envie um arquivo"
            className={inputCls}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs hover:border-accent disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {busy ? "Enviando…" : "Enviar arquivo"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-500"
              >
                <Trash2 className="size-3.5" /> Remover
              </button>
            )}
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          {hint && <span className="block text-[11px] text-muted/80">{hint}</span>}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={kind === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp,image/avif"}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}

/** Galeria de fotos do projeto: upload múltiplo, reordenar e remover. Vai como JSON em `name`. */
export function GalleryField({
  name,
  defaultValue,
  folder,
}: {
  name: string;
  defaultValue: { url: string; alt?: unknown }[];
  folder: string;
}) {
  const [items, setItems] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const urls = await Promise.all([...files].map((f) => uploadFile(f, "media", folder)));
      setItems((prev) => [...prev, ...urls.map((url) => ({ url }))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const move = (i: number, d: number) =>
    setItems((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Galeria de fotos ({items.length})</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs hover:border-accent disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {busy ? "Enviando…" : "Adicionar fotos"}
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          Nenhuma foto. A thumb será usada no modal.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((img, i) => (
            <li
              key={img.url + i}
              className="group relative overflow-hidden rounded-lg border border-line bg-bg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="aspect-video w-full object-cover" />
              <span className="absolute top-1.5 left-1.5 rounded bg-bg/80 px-1.5 font-mono text-[10px]">
                {i + 1}
              </span>
              <div className="flex justify-between gap-1 p-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    aria-label="Mover para a esquerda"
                    className="rounded p-1 hover:bg-surface-2 disabled:opacity-30"
                    disabled={i === 0}
                  >
                    <ArrowUp className="size-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    aria-label="Mover para a direita"
                    className="rounded p-1 hover:bg-surface-2 disabled:opacity-30"
                    disabled={i === items.length - 1}
                  >
                    <ArrowDown className="size-3.5 -rotate-90" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, k) => k !== i))}
                  aria-label="Remover foto"
                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-red-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <input
        ref={fileRef}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
