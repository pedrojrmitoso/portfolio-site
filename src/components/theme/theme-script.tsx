"use client";

import { themeScript } from "./theme";

/**
 * Script inline que aplica o tema antes da pintura (sem flash).
 * No servidor sai como text/javascript (executa no parse do HTML);
 * no cliente vira text/plain para o React não reclamar de <script>.
 * Padrão da doc do Next 16: guides/preventing-flash-before-hydration.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
