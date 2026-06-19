export const WG_STATUS_CONFIG = {
  aktif:       { label: "Aktif",      color: "bg-green-100 text-green-700"  },
  tamamlandi:  { label: "Tamamlandı", color: "bg-gray-100 text-gray-500"    },
  beklemede:   { label: "Beklemede",  color: "bg-yellow-100 text-yellow-700"},
} as const;

export const PHASE_STATUS_CONFIG = {
  planlandi:    { label: "Planlandı",    color: "bg-gray-100 text-gray-500",    dot: "bg-gray-300"    },
  devam_ediyor: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  tamamlandi:   { label: "Tamamlandı",  color: "bg-green-100 text-green-700",  dot: "bg-green-500"   },
} as const;

export const MEMBER_ROLE_CONFIG = {
  kolaylastirici: { label: "Kolaylaştırıcı", color: "bg-purple-100 text-purple-700" },
  katilimci:      { label: "Katılımcı",       color: "bg-blue-100 text-blue-700"    },
  gozlemci:       { label: "Gözlemci",        color: "bg-gray-100 text-gray-500"    },
} as const;

export const FORMAT_CONFIG = {
  yuz_yuze:  { label: "Yüz Yüze",  icon: "🏫" },
  cevrimici: { label: "Çevrimiçi", icon: "💻" },
  hibrit:    { label: "Hibrit",    icon: "🔀" },
} as const;
