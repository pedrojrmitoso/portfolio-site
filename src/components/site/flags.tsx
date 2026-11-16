import type { SVGProps } from "react";
import type { Locale } from "@/i18n/config";

type FlagProps = SVGProps<SVGSVGElement>;

function Brazil(props: FlagProps) {
  return (
    <svg viewBox="0 0 30 30" {...props}>
      <rect width="30" height="30" fill="#009c3b" />
      <path d="M15 4 28 15 15 26 2 15Z" fill="#ffdf00" />
      <circle cx="15" cy="15" r="6.5" fill="#002776" />
      <path d="M8.7 13.4c4.2-.9 8.6-.1 12.5 2.5" fill="none" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
}

function UnitedStates(props: FlagProps) {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg viewBox="0 0 30 30" {...props}>
      {stripes.map((i) => (
        <rect key={i} y={(i * 30) / 13} width="30" height={30 / 13 + 0.1} fill={i % 2 ? "#fff" : "#b22234"} />
      ))}
      <rect width="14" height={(7 * 30) / 13} fill="#3c3b6e" />
      {[3, 7, 11].flatMap((x) =>
        [3.5, 8, 12.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" />),
      )}
    </svg>
  );
}

function France(props: FlagProps) {
  return (
    <svg viewBox="0 0 30 30" {...props}>
      <rect width="10" height="30" fill="#0055a4" />
      <rect x="10" width="10" height="30" fill="#fff" />
      <rect x="20" width="10" height="30" fill="#ef4135" />
    </svg>
  );
}

const flags: Record<Locale, (props: FlagProps) => React.JSX.Element> = {
  pt: Brazil,
  en: UnitedStates,
  fr: France,
};

/** Bandeira circular (decorativa: o código do idioma continua visível ao lado). */
export function Flag({ locale, className = "size-4" }: { locale: Locale; className?: string }) {
  const Svg = flags[locale];
  return <Svg aria-hidden className={`${className} shrink-0 rounded-full ring-1 ring-black/10`} />;
}
