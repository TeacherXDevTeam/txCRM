export const CATEGORY_CONFIG = {
  yapay_zeka:           { label: "Yapay Zeka",          color: "bg-purple-100 text-purple-700" },
  olumlu_okul_iklimi:   { label: "Olumlu Okul İklimi",  color: "bg-green-100 text-green-700"  },
  etkili_ogretmenlik:   { label: "Etkili Öğretmenlik",  color: "bg-blue-100 text-blue-700"    },
  diger:                { label: "Diğer",               color: "bg-gray-100 text-gray-600"    },
} as const;

export const FORMAT_CONFIG = {
  yuz_yuze:  { label: "Yüz Yüze",  icon: "🏫" },
  cevrimici: { label: "Çevrimiçi", icon: "💻" },
  hibrit:    { label: "Hibrit",    icon: "🔀" },
} as const;

export const STATUS_CONFIG = {
  aktif:      { label: "Aktif",      color: "bg-green-100 text-green-700"  },
  pasif:      { label: "Pasif",      color: "bg-gray-100 text-gray-500"    },
  gelistirme: { label: "Geliştirme", color: "bg-yellow-100 text-yellow-700" },
} as const;
