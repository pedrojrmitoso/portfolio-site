/**
 * Classes do painel. Ficam num módulo sem "use client" para que componentes
 * de servidor (links, cabeçalhos) usem exatamente os mesmos estilos.
 */

export const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-accent-solid text-white hover:opacity-90",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "text-muted hover:bg-red-500/10 hover:text-red-500",
} as const;

const sizes = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
} as const;

/** `btn("primary")`, `btn("ghost", "sm")` */
export function btn(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}
