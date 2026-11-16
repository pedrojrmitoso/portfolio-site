"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, THEME_KEY, type ThemePref } from "./theme";

const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setPref(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {}
  applyTheme(pref);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

type Labels = { label: string; light: string; dark: string };

const options = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
] as const;

export function ThemeToggle({ labels, large }: { labels: Labels; large?: boolean }) {
  const pref = useSyncExternalStore(subscribe, readPref, (): ThemePref => "light");

  // Reaplica após o remount do Strict Mode em dev (no-op em produção).
  useLayoutEffect(() => applyTheme(readPref()), []);

  return (
    <div
      role="radiogroup"
      aria-label={labels.label}
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface/60 p-0.5"
    >
      {options.map(({ value, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setPref(value)}
            className={`grid place-items-center rounded-full transition-colors ${large ? "size-11" : "size-7"} ${
              active ? "bg-accent-solid text-white" : "text-muted hover:text-fg"
            }`}
          >
            <Icon className={large ? "size-[18px]" : "size-3.5"} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
