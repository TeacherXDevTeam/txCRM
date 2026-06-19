export const STATUS_CONFIG = {
  planlanmis:    { label: "Planlanmış",    color: "bg-blue-100 text-blue-700",   border: "border-t-blue-400"   },
  devam_ediyor:  { label: "Devam Ediyor",  color: "bg-yellow-100 text-yellow-700", border: "border-t-yellow-400" },
  tamamlandi:    { label: "Tamamlandı",    color: "bg-green-100 text-green-700", border: "border-t-green-400"  },
  iptal:         { label: "İptal",         color: "bg-gray-100 text-gray-500",   border: "border-t-gray-300"   },
} as const;

export type AssignmentStatus = keyof typeof STATUS_CONFIG;
