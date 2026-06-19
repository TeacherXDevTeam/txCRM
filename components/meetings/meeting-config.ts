export const MEETING_TYPE_CONFIG = {
  core_group:   { label: "Core Group",      color: "bg-purple-100 text-purple-700" },
  ekip:         { label: "Ekip Toplantısı", color: "bg-blue-100 text-blue-700"    },
  okul_ziyareti:{ label: "Okul Ziyareti",   color: "bg-green-100 text-green-700"  },
  wg_oturumu:   { label: "WG Oturumu",      color: "bg-orange-100 text-orange-700"},
  diger:        { label: "Diğer",           color: "bg-gray-100 text-gray-600"    },
} as const;

export type MeetingType = keyof typeof MEETING_TYPE_CONFIG;
