"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { KesitKurum } from "./kesit";
import { tr, OranBari } from "./brand";

interface EgitimSatiri {
  egitimAdi: string;
  kurumSayisi: number;
  atananOgretmen: number;
  tamamlayan: number;
  tamamlanmaOrani: number;
  hicBaslamayan: number;
  hicBaslamayanOran: number;
  sertifikaSayisi: number;
}

type Sutun = keyof EgitimSatiri;

const BASLIKLAR: { alan: Sutun; ad: string; sayi: boolean }[] = [
  { alan: "egitimAdi",         ad: "Eğitim",           sayi: false },
  { alan: "kurumSayisi",       ad: "Kurum",            sayi: true },
  { alan: "atananOgretmen",    ad: "Atanan",           sayi: true },
  { alan: "tamamlayan",        ad: "Tamamlayan",       sayi: true },
  { alan: "hicBaslamayanOran", ad: "Hiç Başlamayan %", sayi: true },
  { alan: "sertifikaSayisi",   ad: "Sertifika",        sayi: true },
  { alan: "tamamlanmaOrani",   ad: "Tamamlanma Oranı", sayi: true },
];

export function KesitEgitimAnalizi({ kurumlar }: { kurumlar: KesitKurum[] }) {
  const [kurumFiltre, setKurumFiltre] = useState("");
  const [sirala, setSirala] = useState<Sutun>("tamamlanmaOrani");
  const [artan, setArtan] = useState(true); // en düşük üstte

  const egitimliKurumlar = kurumlar.filter((k) => k.egitimler.length > 0);

  const satirlar = useMemo<EgitimSatiri[]>(() => {
    const kaynak = kurumFiltre ? egitimliKurumlar.filter((k) => k.kurumAdi === kurumFiltre) : egitimliKurumlar;
    const acc = new Map<string, { kurum: Set<string>; atanan: number; tamamlayan: number; hic: number; sert: number }>();
    for (const k of kaynak) {
      for (const e of k.egitimler) {
        const a = acc.get(e.egitimAdi) ?? { kurum: new Set<string>(), atanan: 0, tamamlayan: 0, hic: 0, sert: 0 };
        a.kurum.add(k.kurumAdi);
        a.atanan += e.atananOgretmen;
        a.tamamlayan += e.tamamlayan;
        a.hic += e.hicBaslamayan;
        a.sert += e.sertifikaSayisi;
        acc.set(e.egitimAdi, a);
      }
    }
    return [...acc.entries()].map(([egitimAdi, v]) => ({
      egitimAdi,
      kurumSayisi: v.kurum.size,
      atananOgretmen: v.atanan,
      tamamlayan: v.tamamlayan,
      tamamlanmaOrani: v.atanan ? (v.tamamlayan / v.atanan) * 100 : 0,
      hicBaslamayan: v.hic,
      hicBaslamayanOran: v.atanan ? (v.hic / v.atanan) * 100 : 0,
      sertifikaSayisi: v.sert,
    }));
  }, [egitimliKurumlar, kurumFiltre]);

  const gorunen = useMemo(() => {
    return [...satirlar].sort((a, b) => {
      const x = a[sirala], y = b[sirala];
      const s = typeof x === "string" || typeof y === "string"
        ? String(x).localeCompare(String(y), "tr")
        : (x as number) - (y as number);
      return artan ? s : -s;
    });
  }, [satirlar, sirala, artan]);

  function tikla(alan: Sutun) {
    if (alan === sirala) setArtan((v) => !v);
    else { setSirala(alan); setArtan(alan === "egitimAdi" || alan === "tamamlanmaOrani"); }
  }

  if (egitimliKurumlar.length === 0) {
    return (
      <div className="rounded border-l-[3px] border-tx-kirmizi bg-white px-5 py-4">
        <p className="flex items-center gap-1.5 font-baslik text-sm font-semibold text-tx-metin">
          <Info className="h-4 w-4" /> Bu kesitte eğitim kırılımı yok
        </p>
        <p className="mt-1.5 max-w-[70ch] text-[13px] text-tx-gri">
          Yüklediğiniz dosya <b className="text-tx-metin">özet döküm</b> — her satır bir öğretmen ve
          eğitim adı içermiyor. Hangi eğitimin nerede tıkandığını görmek için platformdan{" "}
          <b className="text-tx-metin">detaylı dökümü</b> (Eğitim ve Sertifika Tarihi sütunlu, her
          satır bir öğretmen × eğitim) indirip yükleyin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="ic-arac flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-baslik text-lg font-semibold text-tx-metin">Eğitim Analizi</h2>
          <p className="text-[12.5px] text-tx-gri">
            {tr(gorunen.length)} eğitim · en düşük tamamlanma üstte · hangi eğitim nerede tıkanıyor
          </p>
        </div>
        <div className="w-72">
          <Select value={kurumFiltre} onChange={(e) => setKurumFiltre(e.target.value)}>
            <option value="">Tüm kurumlar ({egitimliKurumlar.length})</option>
            {egitimliKurumlar.map((k) => <option key={k.kurumAdi} value={k.kurumAdi}>{k.kurumAdi}</option>)}
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
              <th className="w-[18%] border-b border-tx-siyah px-2.5 pb-2.5 pt-3" />
            </tr>
          </thead>
          <tbody>
            {gorunen.map((e) => (
              <tr key={e.egitimAdi} className="hover:bg-tx-kagit">
                <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-medium">{e.egitimAdi}</th>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(e.kurumSayisi)}</td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(e.atananOgretmen)}</td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(e.tamamlayan)}</td>
                <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums ${e.hicBaslamayanOran >= 40 ? "text-tx-kirmizi font-semibold" : ""}`}>
                  %{Math.round(e.hicBaslamayanOran)}
                </td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">{tr(e.sertifikaSayisi)}</td>
                <td className={`border-b border-tx-cizgi px-2.5 py-2.5 text-right font-semibold tabular-nums ${e.tamamlanmaOrani < 50 ? "text-tx-kirmizi" : ""}`}>
                  %{Math.round(e.tamamlanmaOrani)}
                </td>
                <td className="border-b border-tx-cizgi px-2.5 py-2.5"><OranBari oran={e.tamamlanmaOrani} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
