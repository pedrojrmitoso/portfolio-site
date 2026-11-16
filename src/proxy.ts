import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { LOGIN_PATH, redirectFor, RESET_PASSWORD_PATH, sessionState } from "@/lib/admin/session";

function preferredLocale(request: NextRequest): string {
  const cookie = request.cookies.get("locale")?.value;
  if (cookie && hasLocale(cookie)) return cookie;

  const headers = {
    "accept-language": request.headers.get("accept-language") ?? "",
  };
  const languages = new Negotiator({ headers }).languages();
  try {
    return match(languages, [...locales], defaultLocale);
  } catch {
    return defaultLocale;
  }
}

/**
 * /admin: renova a sessão do Supabase (cookies) e faz a checagem otimista
 * de login. A autorização real (é admin?) acontece no servidor, perto dos dados.
 */
async function adminProxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const [{ data }, { data: assurance }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const state = sessionState(data?.claims, assurance);
  const path = request.nextUrl.pathname;
  const isLogin = path === LOGIN_PATH;
  const isReset = path === RESET_PASSWORD_PATH;

  const redirectTo = (target: string) => {
    const url = new URL(target, request.url);
    return NextResponse.redirect(url);
  };

  switch (state) {
    case "none":
      // Login e o link do e-mail de recuperação abrem sem sessão
      if (!isLogin && !isReset) return redirectTo(LOGIN_PATH);
      break;
    case "recovery":
      // Sessão do link de recuperação só serve para definir a senha nova
      if (!isReset) return redirectTo(RESET_PASSWORD_PATH);
      break;
    case "untrusted":
    case "mfa_required":
      if (!isLogin) return redirectTo(redirectFor(state));
      break;
    case "ok": {
      // Logado mas sem permissão de admin: deixa ver a mensagem em vez de entrar em loop
      const notAdmin = request.nextUrl.searchParams.get("error") === "not_admin";
      if (isLogin && !notAdmin) return redirectTo("/admin");
      break;
    }
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminProxy(request);
  }

  const hasPrefix = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasPrefix) return;

  request.nextUrl.pathname = `/${preferredLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Ignora internos, API e arquivos estáticos (com extensão).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
