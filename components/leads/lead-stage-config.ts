export const STAGES = [
  { key: "yeni_baglanti",       label: "Yeni Bağlantı",      color: "border-t-gray-400",    bg: "bg-gray-50",    count_color: "bg-gray-200 text-gray-700"    },
  { key: "ilk_gorusme",         label: "İlk Görüşme",         color: "border-t-blue-400",    bg: "bg-blue-50",    count_color: "bg-blue-200 text-blue-700"    },
  { key: "ihtiyac_analizi",     label: "İhtiyaç Analizi",     color: "border-t-purple-400",  bg: "bg-purple-50",  count_color: "bg-purple-200 text-purple-700" },
  { key: "teklif_hazirlaniyor", label: "Teklif Hazırlanıyor", color: "border-t-yellow-400",  bg: "bg-yellow-50",  count_color: "bg-yellow-200 text-yellow-700" },
  { key: "teklif_verildi",      label: "Teklif Verildi",      color: "border-t-orange-400",  bg: "bg-orange-50",  count_color: "bg-orange-200 text-orange-700" },
  { key: "gorusme_yapildi",     label: "Görüşme Yapıldı",     color: "border-t-indigo-400",  bg: "bg-indigo-50",  count_color: "bg-indigo-200 text-indigo-700" },
] as const;

export const CLOSED_STAGES = [
  { key: "kapandi_kazanildi",  label: "Kazanıldı",  color: "text-green-700 bg-green-100" },
  { key: "kapandi_kaybedildi", label: "Kaybedildi", color: "text-red-700 bg-red-100"     },
] as const;

export const ALL_STAGES = [...STAGES, ...CLOSED_STAGES];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_STAGES.map((s) => [s.key, s.label])
);

export const SOURCE_LABEL: Record<string, string> = {
  referans:    "Referans",
  etkinlik:    "Etkinlik",
  soguk_arama: "Soğuk Arama",
  web:         "Web",
  diger:       "Diğer",
};
