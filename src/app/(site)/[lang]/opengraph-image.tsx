import { ImageResponse } from "next/og";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { getPortfolio } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Route Handler: o idioma vem de `params` (root params ainda não são suportados aqui)
export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const [{ lang }, data] = await Promise.all([params, getPortfolio()]);
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const name = data.profile?.full_name || "Portfolio";
  const role = tr(data.profile?.role, locale);
  const techs = data.technologies.filter((t) => t.show_in_stack).slice(0, 6);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#0a1020",
        backgroundImage:
          "radial-gradient(900px 500px at 85% -10%, rgba(76,141,255,0.35), transparent 70%), radial-gradient(rgba(230,236,250,0.08) 1.5px, transparent 1.5px)",
        backgroundSize: "100% 100%, 28px 28px",
        color: "#e6ecfa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: "#8a97b8" }}>
        <span style={{ color: "#4c8dff" }}>~/</span>
        {name.split(" ")[0].toLowerCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{name}</div>
        {role && <div style={{ marginTop: 24, fontSize: 40, color: "#8a97b8" }}>{role}</div>}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {techs.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #1e2b4d",
              background: "#101a33",
              fontSize: 24,
            }}
          >
            {t.name}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
