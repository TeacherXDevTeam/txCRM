import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  aktif:       { label: "Aktif",       variant: "success"     },
  potansiyel:  { label: "Potansiyel",  variant: "warning"     },
  pasif:       { label: "Pasif",       variant: "secondary"   },
} as const;

export function SchoolStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
