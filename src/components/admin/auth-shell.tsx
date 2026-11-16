import { Suspense, type ReactNode } from "react";

/** Moldura das telas fora do painel (login, redefinir senha). */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="bg-instrument grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/90 p-7 shadow-2xl backdrop-blur">
        <p className="font-mono text-sm">
          <span className="text-accent">~/</span>admin
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {/* useSearchParams nos formulários exige Suspense */}
        <Suspense>{children}</Suspense>
      </div>
    </main>
  );
}
