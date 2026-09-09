"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { KesitKurum } from "./kesit";
import { tr } from "./brand";

interface SubeSatiri {
  kurumAdi: string;
  subeAdi: string;
  ogretmenSayisi: number;
  egitimSayisi: number | null;
  ilerlemeOrtalamasi: number;
  tamamlanmaOrani: number;
  sertifikaSayisi: number | null;
  hicBaslamayan: number;
  hicBaslamayanOran: number;
  devamEden: number;
  tumunuTamamlayan: number;
}

type Sutun = keyof SubeSatiri;

const BASLIKLAR: { alan: Sutun; ad: string; sayi: boolean }[] = [
  { alan: "kurumAdi",           ad: "Kurum",             sayi: false },
  { alan: "subeAdi",            ad: "Şube",              sayi: false },
  { alan: "ogretmenSayisi",     ad: "Öğretmen",          sayi: true },
  { alan: "egitimSayisi",       ad: "Eğitim",            sayi: true },
  { alan: "ilerlemeOrtalamasi", ad: "İlerleme Ort.",     sayi: true },
  { alan: "tamamlanmaOrani",    ad: "Tamamlanma Oranı",  sayi: true },
  { alan: "sertifikaSayisi",    ad: "Sertifika",         sayi: true },
  { alan: "hicBaslamayanOran",  ad: "Hiç Başlamayan %",  sayi: true },
  { alan: "devamEden",          ad: "Devam Eden",        sayi: true },
  { alan: "tumunuTamamlayan",   ad: "Tümünü Tamamlayan", sayi: true },
];

function skala(oran: number, ters = false): string {
  const v = ters ? 1 - oran : oran;
  if (v >= 0.8) return "bg-[#DCEFDC]";
  if (v >= 0.6) return "bg-[#ECF4E0]";
  if (v >= 0.4) return "bg-[#FBF3DC]";
  if (v >= 0.2) return "bg-[#FBE6DA]";
  return "bg-[#F9DEDC]";
}

export function KesitSubeAnalizi({ kurumlar }: { kurumlar: KesitKurum[] }) {
  const [kurumFiltre, setKurumFiltre] = useState("");
  const [sirala, setSirala] = useState<Sutun>("ilerlemeOrtalamasi");
  const [artan, setArtan] = useState(false);

  const satirlar = useMemo<SubeSatiri[]>(
    () =>
      kurumlar.flatMap((k) =>
        k.subeler.map((s) => ({
          kurumAdi: k.kurumAdi,
          subeAdi: s.subeAdi,
          ogretmenSayisi: s.ogretmenSayisi,
          egitimSayisi: s.egitimSayisi,
          ilerlemeOrtalamasi: s.ilerlemeOrtalamasi,
          tamamlanmaOrani: s.tamamlanmaOrani,
          sertifikaSayisi: s.sertifikaSayisi,
          hicBaslamayan: s.hicBaslamayan,
          hicBaslamayanOran: s.ogretmenSayisi ? (s.hicBaslamayan / s.ogretmenSayisi) * 100 : 0,
          devamEden: s.devamEden,
          tumunuTamamlayan: s.tumunuTamamlayan,
        }))
      ),
    [kurumlar]
  );

  const gorunen = useMemo(() => {
    const f = kurumFiltre ? satirlar.filter((s) => s.kurumAdi === kurumFiltre) : satirlar;
    return [...f].sort((a, b) => {
      const x = a[sirala] ?? -1, y = b[sirala] ?? -1;
      const s = typeof x === "string" || typeof y === "string"
        ? String(x).localeCompare(String(y), "tr")
        : (x as number) - (y as number);
      return artan ? s : -s;
    });
  }, [satirlar, kurumFiltre, sirala, artan]);

  function tikla(alan: Sutun) {
    if (alan === sirala) setArtan((v) => !v);
    else { setSirala(alan); setArtan(alan === "kurumAdi" || alan === "subeAdi"); }
  }

  return (
    <div className="space-y-3">
      <div className="ic-arac flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-baslik text-lg font-semibold text-tx-metin">Şube Analizi</h2>
          <p className="text-[12.5px] text-tx-gri">
            {tr(gorunen.length)} şube{kurumFiltre ? "" : ` · ${kurumlar.length} kurum`} ·
            &quot;Hiç Başlamayan %&quot; sütununda renk ters çalışır: yüksek oran kırmızıdır
          </p>
        </div>
        <div className="w-72">
          <Select value={kurumFiltre} onChange={(e) => setKurumFiltre(e.target.value)}>
            <option value="">Tüm kurumlar</option>
            {kurumlar.map((k) => <option key={k.kurumAdi} value={k.kurumAdi}>{k.kurumAdi}</option>)}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {BASLIKLAR.map((b) => (
                <th key={b.alan} onClick={() => tikla(b.alan)}
                    className={`cursor-pointer select-none border-b border-tx-siyah px-2.5 pb-2.5 pt-3 text-[11.5px] font-medium text-tx-gri hover:text-tx-metin ${
                      b.sayi ? "text-right" : "text-left"} ${sirala === b.alan ? "text-tx-metin" : ""}`}>
                  <span className={`inline-flex items-center gap-1 ${b.sayi ? "flex-row-reverse" : ""}`}>
                    {b.ad}
                    {sirala === b.alan && <ArrowUpDown className="h-3 w-3 text-tx-kirmizi" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gorunen.map((s, i) => (
              <tr key={`${s.kurumAdi}|${s.subeAdi}|${i}`} className="hover:bg-tx-kagit">
                <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-normal text-tx-gri">{s.kurumAdi}</th>
                <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-medium">{s.subeAdi}</th>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(s.ogretmenSayisi)}</td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                  {s.egitimSayisi === null ? <span className="text-tx-gri">—</span> : tr(s.egitimSayisi)}
                </td>
                <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${skala(s.ilerlemeOrtalamasi / 100)}`}>%{s.ilerlemeOrtalamasi.toFixed(1)}</td>
                <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${skala(s.tamamlanmaOrani / 100)}`}>%{s.tamamlanmaOrani.toFixed(1)}</td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                  {s.sertifikaSayisi === null ? <span className="text-tx-gri">—</span> : tr(s.sertifikaSayisi)}
                </td>
                <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums ${skala(s.hicBaslamayanOran / 100, true)}`}>
                  %{Math.round(s.hicBaslamayanOran)}
                  <span className="ml-1 text-[10px] text-tx-gri">{tr(s.hicBaslamayan)}</span>
                </td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(s.devamEden)}</td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(s.tumunuTamamlayan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
