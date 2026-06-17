import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG = {
  okul_koordinatoru: { label: "Okul Koor.",  variant: "default"     },
  egitmen:           { label: "Eğitmen",     variant: "success"     },
  partner:           { label: "Partner",     variant: "secondary"   },
  potansiyel:        { label: "Potansiyel",  variant: "warning"     },
  diger:             { label: "Diğer",       variant: "outline"     },
} as const;

export function ContactTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? { label: type, variant: "outline" as const };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
