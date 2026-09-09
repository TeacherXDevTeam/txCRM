"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { KesitKurum } from "./kesit";
import { tr } from "./brand";

type Sutun =
  | "kurumAdi" | "ogretmenSayisi" | "subeSayisi" | "egitimSayisi"
  | "ilerlemeOrtalamasi" | "tamamlanmaOrani" | "sertifikaSayisi"
  | "sertifikaAlan" | "hicBaslamayan" | "tumunuTamamlayan";

const BASLIKLAR: { alan: Sutun; ad: string; sayi: boolean; tersRenk?: boolean }[] = [
  { alan: "kurumAdi",           ad: "Kurum",              sayi: false },
  { alan: "ogretmenSayisi",     ad: "Öğretmen",           sayi: true },
  { alan: "subeSayisi",         ad: "Şube",               sayi: true },
  { alan: "egitimSayisi",       ad: "Eğitim",             sayi: true },
  { alan: "ilerlemeOrtalamasi", ad: "İlerleme Ort.",      sayi: true },
  { alan: "tamamlanmaOrani",    ad: "Tamamlanma Oranı",   sayi: true },
  { alan: "sertifikaSayisi",    ad: "Sertifika",          sayi: true },
  { alan: "sertifikaAlan",      ad: "Sertifika Alan",     sayi: true },
  { alan: "hicBaslamayan",      ad: "Hiç Başlamayan",     sayi: true, tersRenk: true },
  { alan: "tumunuTamamlayan",   ad: "Tümünü Tamamlayan",  sayi: true },
];

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
                title="Sıralamak için tıklayın"
              >
                <span className={`inline-flex items-center gap-1 ${b.sayi ? "flex-row-reverse" : ""}`}>
                  {b.ad}
                  {sirala === b.alan && <ArrowUpDown className="h-3 w-3 text-tx-kirmizi" />}
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
