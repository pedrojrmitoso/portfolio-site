import type { ComponentType, SVGProps } from "react";
import { Globe, Mail } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import { SiGithub, SiIndeed, SiKaggle, SiMedium, SiWhatsapp, SiX, SiYoutube } from "react-icons/si";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const socialPlatforms: Record<string, { label: string; Icon: IconComponent }> = {
  github: { label: "GitHub", Icon: SiGithub },
  linkedin: { label: "LinkedIn", Icon: FaLinkedin },
  indeed: { label: "Indeed", Icon: SiIndeed },
  email: { label: "E-mail", Icon: Mail },
  kaggle: { label: "Kaggle", Icon: SiKaggle },
  medium: { label: "Medium", Icon: SiMedium },
  youtube: { label: "YouTube", Icon: SiYoutube },
  whatsapp: { label: "WhatsApp", Icon: SiWhatsapp },
  x: { label: "X", Icon: SiX },
  website: { label: "Website", Icon: Globe },
};

export function SocialIcon({ platform, className = "size-4" }: { platform: string; className?: string }) {
  const Icon = socialPlatforms[platform]?.Icon ?? Globe;
  return <Icon aria-hidden className={className} />;
}
