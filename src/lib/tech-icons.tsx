import type { ComponentType, CSSProperties, SVGProps } from "react";
import Image from "next/image";
import {
  SiAnthropic,
  SiApacheairflow,
  SiApachekafka,
  SiApachespark,
  SiClaude,
  SiDatabricks,
  SiDjango,
  SiDocker,
  SiFastapi,
  SiFirebase,
  SiFlask,
  SiGit,
  SiGithub,
  SiGooglebigquery,
  SiGooglecloud,
  SiHuggingface,
  SiJavascript,
  SiJupyter,
  SiKeras,
  SiKubernetes,
  SiLangchain,
  SiLinux,
  SiLooker,
  SiMetabase,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiNumpy,
  SiOllama,
  SiPandas,
  SiPlotly,
  SiPolars,
  SiPostgresql,
  SiPython,
  SiPytorch,
  SiR,
  SiReact,
  SiRedis,
  SiScikitlearn,
  SiSnowflake,
  SiStreamlit,
  SiSupabase,
  SiTailwindcss,
  SiTensorflow,
  SiTypescript,
  SiVercel,
} from "react-icons/si";
import { IoLogoTableau } from "react-icons/io5";
import { TbBrandAws, TbBrandOpenai } from "react-icons/tb";
import { VscAzure } from "react-icons/vsc";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: string | number }>;

/** Power BI não existe nos pacotes de ícones: SVG próprio (barras). */
function PowerBiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="14" y="2" width="6" height="20" rx="1.5" />
      <rect x="8.5" y="7" width="6" height="15" rx="1.5" opacity=".8" />
      <rect x="3" y="12" width="6" height="10" rx="1.5" opacity=".6" />
    </svg>
  );
}

export type TechIconDef = {
  label: string;
  Icon: IconComponent;
  /** Cor da marca; ausente = usa a cor do texto (logos pretos/brancos). */
  color?: string;
  category: TechCategory;
};

export const techCategories = ["languages", "data", "bi", "ai", "cloud", "tools"] as const;
export type TechCategory = (typeof techCategories)[number];

/** Catálogo curado: a chave é o que fica salvo em technologies.icon */
export const techIcons: Record<string, TechIconDef> = {
  python: { label: "Python", Icon: SiPython, color: "#3776AB", category: "languages" },
  r: { label: "R", Icon: SiR, color: "#276DC3", category: "languages" },
  postgresql: { label: "SQL / PostgreSQL", Icon: SiPostgresql, color: "#4169E1", category: "languages" },
  mysql: { label: "MySQL", Icon: SiMysql, color: "#4479A1", category: "languages" },
  typescript: { label: "TypeScript", Icon: SiTypescript, color: "#3178C6", category: "languages" },
  javascript: { label: "JavaScript", Icon: SiJavascript, color: "#F7DF1E", category: "languages" },

  pandas: { label: "Pandas", Icon: SiPandas, color: "#E70488", category: "data" },
  numpy: { label: "NumPy", Icon: SiNumpy, color: "#4DABCF", category: "data" },
  polars: { label: "Polars", Icon: SiPolars, color: "#CD792C", category: "data" },
  jupyter: { label: "Jupyter", Icon: SiJupyter, color: "#F37626", category: "data" },
  spark: { label: "Apache Spark", Icon: SiApachespark, color: "#E25A1C", category: "data" },
  airflow: { label: "Airflow", Icon: SiApacheairflow, color: "#017CEE", category: "data" },
  kafka: { label: "Kafka", Icon: SiApachekafka, category: "data" },
  databricks: { label: "Databricks", Icon: SiDatabricks, color: "#FF3621", category: "data" },
  snowflake: { label: "Snowflake", Icon: SiSnowflake, color: "#29B5E8", category: "data" },

  powerbi: { label: "Power BI", Icon: PowerBiIcon, color: "#F2C811", category: "bi" },
  tableau: { label: "Tableau", Icon: IoLogoTableau, color: "#E97627", category: "bi" },
  looker: { label: "Looker", Icon: SiLooker, color: "#4285F4", category: "bi" },
  excel: { label: "Excel", Icon: PiMicrosoftExcelLogoFill, color: "#21A366", category: "bi" },
  metabase: { label: "Metabase", Icon: SiMetabase, color: "#509EE3", category: "bi" },
  streamlit: { label: "Streamlit", Icon: SiStreamlit, color: "#FF4B4B", category: "bi" },
  plotly: { label: "Plotly", Icon: SiPlotly, color: "#7A76FF", category: "bi" },

  scikitlearn: { label: "scikit-learn", Icon: SiScikitlearn, color: "#F7931E", category: "ai" },
  tensorflow: { label: "TensorFlow", Icon: SiTensorflow, color: "#FF6F00", category: "ai" },
  pytorch: { label: "PyTorch", Icon: SiPytorch, color: "#EE4C2C", category: "ai" },
  keras: { label: "Keras", Icon: SiKeras, color: "#D00000", category: "ai" },
  huggingface: { label: "Hugging Face", Icon: SiHuggingface, color: "#FFD21E", category: "ai" },
  langchain: { label: "LangChain", Icon: SiLangchain, category: "ai" },
  openai: { label: "OpenAI", Icon: TbBrandOpenai, category: "ai" },
  claude: { label: "Claude", Icon: SiClaude, color: "#D97757", category: "ai" },
  anthropic: { label: "Anthropic", Icon: SiAnthropic, category: "ai" },
  ollama: { label: "Ollama", Icon: SiOllama, category: "ai" },

  supabase: { label: "Supabase", Icon: SiSupabase, color: "#3FCF8E", category: "cloud" },
  bigquery: { label: "BigQuery", Icon: SiGooglebigquery, color: "#669DF6", category: "cloud" },
  gcp: { label: "Google Cloud", Icon: SiGooglecloud, color: "#4285F4", category: "cloud" },
  aws: { label: "AWS", Icon: TbBrandAws, color: "#FF9900", category: "cloud" },
  azure: { label: "Azure", Icon: VscAzure, color: "#0078D4", category: "cloud" },
  firebase: { label: "Firebase", Icon: SiFirebase, color: "#FFCA28", category: "cloud" },
  mongodb: { label: "MongoDB", Icon: SiMongodb, color: "#47A248", category: "cloud" },
  redis: { label: "Redis", Icon: SiRedis, color: "#FF4438", category: "cloud" },
  vercel: { label: "Vercel", Icon: SiVercel, category: "cloud" },

  docker: { label: "Docker", Icon: SiDocker, color: "#2496ED", category: "tools" },
  kubernetes: { label: "Kubernetes", Icon: SiKubernetes, color: "#326CE5", category: "tools" },
  git: { label: "Git", Icon: SiGit, color: "#F05032", category: "tools" },
  github: { label: "GitHub", Icon: SiGithub, category: "tools" },
  linux: { label: "Linux", Icon: SiLinux, color: "#FCC624", category: "tools" },
  fastapi: { label: "FastAPI", Icon: SiFastapi, color: "#009688", category: "tools" },
  django: { label: "Django", Icon: SiDjango, color: "#44B78B", category: "tools" },
  flask: { label: "Flask", Icon: SiFlask, category: "tools" },
  nextjs: { label: "Next.js", Icon: SiNextdotjs, category: "tools" },
  react: { label: "React", Icon: SiReact, color: "#61DAFB", category: "tools" },
  nodejs: { label: "Node.js", Icon: SiNodedotjs, color: "#5FA04E", category: "tools" },
  tailwind: { label: "Tailwind CSS", Icon: SiTailwindcss, color: "#06B6D4", category: "tools" },
};

export function TechIcon({
  icon,
  iconUrl,
  color,
  name,
  className = "size-4",
}: {
  icon: string | null;
  /** Imagem enviada no painel: tem prioridade sobre o catálogo. */
  iconUrl?: string | null;
  color?: string | null;
  name: string;
  className?: string;
}) {
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt=""
        aria-hidden
        width={72}
        height={72}
        className={`${className} object-contain`}
      />
    );
  }
  const def = icon ? techIcons[icon] : undefined;
  if (!def) {
    // Sem logo no catálogo: monograma com a inicial
    return (
      <span
        aria-hidden
        className={`${className} grid place-items-center rounded-[4px] bg-accent/15 font-mono text-[0.6em] font-semibold text-accent`}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const { Icon } = def;
  const brand = color || def.color;
  if (!brand) return <Icon aria-hidden className={className} />;

  // Cor da marca ajustada por tema para manter contraste >= 3:1 (WCAG, elemento gráfico)
  return (
    <Icon
      aria-hidden
      className={`${className} text-[color-mix(in_srgb,var(--brand)_60%,#0b1530)] dark:text-[color-mix(in_srgb,var(--brand)_85%,#fff)]`}
      style={{ "--brand": brand } as CSSProperties}
    />
  );
}
