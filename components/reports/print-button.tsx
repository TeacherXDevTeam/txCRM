"use client";

import { Printer } from "lucide-react";

/**
 * Çıktı türünü <body data-print="..."> ile işaretler; hangi bölümlerin
 * basılacağını globals.css'teki @media print kuralları belirler.
 *
 * "kurum" → toplulaştırılmış rapor, isim içermez (kuruma gönderilir)
 * "liste" → öğretmen listesi, isim içerir (iç kullanım)
 */
export function YazdirButonu({
  mod, etiket, ikincil = false,
}: { mod: "kurum" | "liste"; etiket: string; ikincil?: boolean }) {
  function yazdir() {
    document.body.dataset.print = mod;

    let temizlendi = false;
    const temizle = () => {
      if (temizlendi) return;
      temizlendi = true;
      delete document.body.dataset.print;
      window.removeEventListener("afterprint", temizle);
    };
    window.addEventListener("afterprint", temizle);
    // Safari afterprint'i her zaman tetiklemiyor — işareti asılı bırakmamak için
    setTimeout(temizle, 60_000);

    window.print();
  }

  return (
    <button
      onClick={yazdir}
      title="Yazdırma penceresinde 'Hedef: PDF olarak kaydet' seçin"
      className={`inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors ${
        ikincil
          ? "border border-tx-cizgi bg-white text-tx-metin hover:bg-tx-kagit"
          : "bg-tx-siyah text-white hover:bg-tx-metin"
      }`}
    >
      <Printer className="h-4 w-4" />
      {etiket}
    </button>
  );
}
