export const STATUS_CONFIG = {
  aktif:        { label: "Aktif",        color: "bg-green-100 text-green-700"  },
  suresi_doldu: { label: "Süresi Doldu", color: "bg-gray-100 text-gray-500"    },
  iptal:        { label: "İptal",        color: "bg-red-100 text-red-600"      },
} as const;

export const PAYMENT_CONFIG = {
  odeme_bekleniyor: { label: "Ödeme Bekleniyor", color: "bg-orange-100 text-orange-700" },
  kismi:            { label: "Kısmi Ödendi",      color: "bg-yellow-100 text-yellow-700" },
  tamamlandi:       { label: "Tamamlandı",         color: "bg-green-100 text-green-700"  },
} as const;
