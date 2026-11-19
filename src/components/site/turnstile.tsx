"use client";

import Script from "next/script";
import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = { reset: () => void };

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Widget do Cloudflare Turnstile. Ele mesmo grava o token num input oculto
 * "cf-turnstile-response" dentro do formulário; a server action valida.
 * Só aparece se a Cloudflare precisar de interação; na maioria das vezes fica invisível.
 */
export function Turnstile({ ref, language }: { ref?: Ref<TurnstileHandle>; language: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  const render = useCallback(() => {
    if (!SITE_KEY || !box.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: SITE_KEY,
      action: "contact",
      appearance: "interaction-only",
      theme: "auto",
      language,
    });
  }, [language]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  // Script já carregado (navegação entre idiomas): renderiza direto
  useEffect(() => {
    render();
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [render]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
      />
      <div ref={box} className="sm:col-span-2 empty:hidden" />
    </>
  );
}
