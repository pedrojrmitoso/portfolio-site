export type ThemePref = "light" | "dark";
export const THEME_KEY = "theme";

/**
 * Roda no <head> antes da primeira pintura: aplica a preferência salva
 * (light/dark) no <html>, evitando "flash". Sem preferência salva, parte
 * do tema do SO apenas como valor inicial.
 */
export const themeScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  root.dataset.theme = pref;
  root.style.colorScheme = pref;
}
