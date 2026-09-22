"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Info } from "lucide-react";
import type { KesitKurum } from "./kesit";
import { tr } from "./brand";

type Sutun =
  | "kurumAdi" | "ogretmenSayisi" | "subeSayisi" | "egitimSayisi"
  | "ilerlemeOrtalamasi" | "tamamlanmaOrani" | "sertifikaSayisi"
  | "sertifikaAlan" | "hicBaslamayan" | "tumunuTamamlayan"
  | "beklenenOgretmen" | "sapma";

const BASLIKLAR: { alan: Sutun; ad: string; sayi: boolean; tersRenk?: boolean; aciklama?: string }[] = [
  { alan: "kurumAdi",           ad: "Kurum",              sayi: false },
  { alan: "ogretmenSayisi",     ad: "Öğretmen",           sayi: true,  aciklama: "Kurumdaki toplam öğretmen sayısı (e-posta ile tekilleştirilir)." },
  { alan: "subeSayisi",         ad: "Şube",               sayi: true,  aciklama: "Kurumun rapordaki şube sayısı." },
  { alan: "egitimSayisi",       ad: "Eğitim",             sayi: true,  aciklama: "Kuruma atanan farklı eğitim sayısı. (Özet dökümde bilinmez, — görünür.)" },
  { alan: "ilerlemeOrtalamasi", ad: "İlerleme Ort.",      sayi: true,  aciklama: "Öğretmenlerin tüm eğitimlerdeki ilerleme yüzdelerinin ortalaması. Yarım kalan (kısmi) ilerleme de sayılır." },
  { alan: "tamamlanmaOrani",    ad: "Tamamlanma Oranı",   sayi: true,  aciklama: "Tamamen bitirilen eğitimlerin atanan eğitimlere oranı. Yarım kalanlar sayılmaz. İlerleme Ort. ile farkı = başlanmış ama bitmemiş iş." },
  { alan: "sertifikaSayisi",    ad: "Sertifika",          sayi: true,  aciklama: "Verilen toplam sertifika sayısı (bir öğretmen birden çok alabilir)." },
  { alan: "sertifikaAlan",      ad: "Sertifika Alan",     sayi: true,  aciklama: "En az bir sertifika almış öğretmen sayısı." },
  { alan: "hicBaslamayan",      ad: "Hiç Başlamayan",     sayi: true, tersRenk: true, aciklama: "Hiçbir eğitime başlamamış öğretmen sayısı (ve kuruma oranı). Yüksek olması kötüdür." },
  { alan: "tumunuTamamlayan",   ad: "Tümünü Tamamlayan",  sayi: true,  aciklama: "Atanan tüm eğitimlerini bitiren öğretmen sayısı (ve kuruma oranı)." },
  { alan: "beklenenOgretmen",   ad: "Beklenen",           sayi: true,  aciklama: "Okulun sezon hedefi (olması gereken öğretmen sayısı). Gruplu okulda grup adı görünür; hedefsizde —." },
  { alan: "sapma",              ad: "Sapma",              sayi: true, tersRenk: true, aciklama: "Gerçek − beklenen. Eksik (−) kırmızı. Gruplu okullar tek tek değil grup toplamı olarak kontrol edilir (— görünür)." },
];

/** Satır bazında sapma. Gruplu okul veya hedefsiz okul için null (grup toplu kontrol edilir). */
function sapmaOf(k: KesitKurum): number | null {
  if (k.beklenenGrup) return null;
  if (k.beklenenOgretmen == null) return null;
  return k.ogretmenSayisi - k.beklenenOgretmen;
}

/** Düşük → yüksek kırmızıdan yeşile; tersRenk'te yüksek kırmızı. */
function skala(oran: number, ters = false): string {
  const v = ters ? 1 - oran : oran;
  if (v >= 0.8) return "bg-[#DCEFDC]";
  if (v >= 0.6) return "bg-[#ECF4E0]";
  if (v >= 0.4) return "bg-[#FBF3DC]";
  if (v >= 0.2) return "bg-[#FBE6DA]";
  return "bg-[#F9DEDC]";
}

export function KesitKarsilastirma({
  kurumlar, onKurumSec,
}: { kurumlar: KesitKurum[]; onKurumSec: (kurum: string) => void }) {
  const [sirala, setSirala] = useState<Sutun>("ilerlemeOrtalamasi");
  const [artan, setArtan] = useState(false);

  const sirali = useMemo(() => {
    const k = [...kurumlar];
    k.sort((a, b) => {
      // Beklenen / Sapma: değeri olmayanlar (grup üyesi / hedefsiz) her zaman en sonda
      if (sirala === "sapma" || sirala === "beklenenOgretmen") {
        const x = sirala === "sapma" ? sapmaOf(a) : a.beklenenOgretmen ?? null;
        const y = sirala === "sapma" ? sapmaOf(b) : b.beklenenOgretmen ?? null;
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return artan ? x - y : y - x;
      }
      const x = a[sirala] ?? -1, y = b[sirala] ?? -1;
      const s = typeof x === "string" || typeof y === "string"
        ? String(x).localeCompare(String(y), "tr")
        : (x as number) - (y as number);
      return artan ? s : -s;
    });
    return k;
  }, [kurumlar, sirala, artan]);

  function basligaTikla(alan: Sutun) {
    if (alan === sirala) setArtan((v) => !v);
    else { setSirala(alan); setArtan(alan === "kurumAdi"); }
  }

  return (
    <div className="overflow-x-auto rounded bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {BASLIKLAR.map((b) => (
              <th
                key={b.alan}
                onClick={() => basligaTikla(b.alan)}
                className={`cursor-pointer select-none border-b border-tx-siyah px-2.5 pb-2.5 pt-3 text-[11.5px] font-medium text-tx-gri hover:text-tx-metin ${
                  b.sayi ? "text-right" : "text-left"
                } ${sirala === b.alan ? "text-tx-metin" : ""}`}
                title={b.aciklama ? `${b.aciklama}\n\n(Sıralamak için tıklayın)` : "Sıralamak için tıklayın"}
              >
                <span className={`inline-flex items-center gap-1 ${b.sayi ? "flex-row-reverse" : ""}`}>
                  {b.ad}
                  {sirala === b.alan && <ArrowUpDown className="h-3 w-3 text-tx-kirmizi" />}
                  {b.aciklama && <Info className="h-3 w-3 shrink-0 text-tx-gri opacity-60" aria-hidden />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sirali.map((k) => (
            <tr key={k.kurumAdi} className="hover:bg-tx-kagit">
              <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-medium">
                <button onClick={() => onKurumSec(k.kurumAdi)} className="text-left hover:text-tx-kirmizi hover:underline">
                  {k.kurumAdi}
                </button>
              </th>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(k.ogretmenSayisi)}</td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(k.subeSayisi)}</td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{k.egitimSayisi === null ? <span className="text-tx-gri">—</span> : tr(k.egitimSayisi)}</td>
              <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${skala(k.ilerlemeOrtalamasi / 100)}`}>
                %{k.ilerlemeOrtalamasi.toFixed(1)}
              </td>
              <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${skala(k.tamamlanmaOrani / 100)}`}>
                %{k.tamamlanmaOrani.toFixed(1)}
              </td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{k.sertifikaSayisi === null ? <span className="text-tx-gri">—</span> : tr(k.sertifikaSayisi)}</td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{k.sertifikaAlan === null ? <span className="text-tx-gri">—</span> : tr(k.sertifikaAlan)}</td>
              <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums ${skala(k.hicBaslamayan / Math.max(k.ogretmenSayisi, 1), true)}`}>
                {tr(k.hicBaslamayan)}
                <span className="ml-1 text-[10px] text-tx-gri">
                  %{Math.round((k.hicBaslamayan / Math.max(k.ogretmenSayisi, 1)) * 100)}
                </span>
              </td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                {tr(k.tumunuTamamlayan)}
                <span className="ml-1 text-[10px] text-tx-gri">
                  %{Math.round((k.tumunuTamamlayan / Math.max(k.ogretmenSayisi, 1)) * 100)}
                </span>
              </td>
              <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                {k.beklenenGrup
                  ? <span className="text-[10px] text-tx-gri">{k.beklenenGrup}</span>
                  : k.beklenenOgretmen == null ? <span className="text-tx-gri">—</span> : tr(k.beklenenOgretmen)}
              </td>
              {(() => {
                const s = sapmaOf(k);
                return (
                  <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${s == null ? "" : s < 0 ? "text-tx-kirmizi" : "text-tx-metin"}`}>
                    {s == null ? <span className="font-normal text-tx-gri">—</span> : `${s > 0 ? "+" : ""}${tr(s)}`}
                  </td>
                );
              })()}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-tx-kagit font-semibold">
            <th className="px-2.5 py-2.5 text-left">TOPLAM · {kurumlar.length} kurum</th>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + k.ogretmenSayisi, 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + k.subeSayisi, 0))}</td>
            <td className="px-2.5 py-2.5 text-right text-tx-gri">—</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">%{agirlikli(kurumlar, "ilerlemeOrtalamasi").toFixed(1)}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">%{agirlikli(kurumlar, "tamamlanmaOrani").toFixed(1)}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + (k.sertifikaSayisi ?? 0), 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + (k.sertifikaAlan ?? 0), 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + k.hicBaslamayan, 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + k.tumunuTamamlayan, 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{tr(kurumlar.reduce((a, k) => a + (k.beklenenGrup ? 0 : k.beklenenOgretmen ?? 0), 0))}</td>
            <td className="px-2.5 py-2.5 text-right tabular-nums">{(() => { const t = kurumlar.reduce((a, k) => a + (sapmaOf(k) ?? 0), 0); return `${t > 0 ? "+" : ""}${tr(t)}`; })()}</td>
          </tr>
        </tfoot>
      </table>
      <p className="px-2.5 py-2 text-[11px] text-tx-gri">
        Toplam satırındaki ortalamalar öğretmen sayısıyla ağırlıklıdır — kurum ortalamalarının
        ortalaması değildir.
      </p>
    </div>
  );
}

/** Öğretmen sayısıyla ağırlıklı ortalama. */
function agirlikli(kurumlar: KesitKurum[], alan: "ilerlemeOrtalamasi" | "tamamlanmaOrani"): number {
  const toplamKisi = kurumlar.reduce((a, k) => a + k.ogretmenSayisi, 0);
  if (!toplamKisi) return 0;
  return kurumlar.reduce((a, k) => a + k[alan] * k.ogretmenSayisi, 0) / toplamKisi;
}
