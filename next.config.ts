import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não definida (veja .env.example)");

const supabase = new URL(supabaseUrl).origin;
const turnstile = "https://challenges.cloudflare.com";
const isDev = process.env.NODE_ENV === "development";
// Barra de comentários da Vercel, só nos deploys de preview
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// Sem nonce de propósito: nonce obriga render dinâmico e acaba com o cache das páginas (cacheComponents).
// 'unsafe-inline' cobre o script do tema e os scripts inline do Next; scripts de outros domínios ficam bloqueados.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${turnstile}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}${vercelLive}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")} ${turnstile}${vercelLive}`,
  `frame-src ${turnstile}${vercelLive}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Isola a janela de outras origens (window.opener); o site não depende de pop-ups
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [new URL("/storage/v1/object/public/**", supabaseUrl)],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
