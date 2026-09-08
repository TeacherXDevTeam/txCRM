"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, EyeOff } from "lucide-react";
import type { TeacherRow } from "./teacher-report-client";
import { UstSerit, RaporBasligi, tr } from "./brand";

/**
 * Öğretmen listesi — İSİM İÇERİR, ayrı bir çıktıdır.
 *
 * Kaynak, bu oturumda yüklenen ham satırlardır; veritabanına yazılmaz ve
 * sayfa yenilenince kaybolur. Kurum raporu toplulaştırılmış özetten üretilir,
 * bu liste ondan bağımsızdır — ikisi asla aynı PDF'e basılmaz.
 */
export function TeacherListesi({
  kurum, tarih, satirlar,
}: { kurum: string; tarih: string; satirlar: TeacherRow[] }) {
  const [acik, setAcik] = useState(false);

  const subeler = useMemo(() => {
    const m = new Map<string, TeacherRow[]>();
    for (const r of satirlar) {
      const k = r.sube || "Şube bilgisi eksik";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()]
      .map(([sube, rows]) => ({
        sube,
        rows: [...rows].sort((a, b) => a.yuzde - b.yuzde || a.ad.localeCompare(b.ad, "tr")),
        ort: Math.round(rows.reduce((a, r) => a + r.yuzde, 0) / rows.length),
      }))
      .sort((a, b) => a.sube.localeCompare(b.sube, "tr"));
  }, [satirlar]);

  return (
    <div className="yalniz-liste">
      {/* Ekranda katlanır bir bölüm; çıktıda tam liste basılır */}
      <div className="ic-arac mx-auto max-w-[900px] px-7 pb-10">
        <button
          onClick={() => setAcik((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded border border-tx-cizgi bg-white px-4 py-3 text-left hover:bg-tx-kagit"
        >
          <span>
            <span className="font-baslik text-sm font-semibold">
              Öğretmen Listesi — {tr(satirlar.length)} öğretmen
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-tx-gri">
              <EyeOff className="h-3.5 w-3.5" />
              İsim içerir · yalnızca bu oturumda mevcut, kaydedilmez · kurum raporuna girmez
            </span>
          </span>
          {acik ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
      </div>

      <div className={acik ? "" : "hidden print:block"}>
        {/* Çıktıda kendi başlığıyla basılsın */}
        <div className="hidden print:block">
          <UstSerit tarih={tarih} />
          <RaporBasligi
            kurum={kurum}
            altBaslik="Öğretmen Listesi — iç kullanım"
            meta={
              <>
                <b className="font-medium text-tx-metin">{tr(satirlar.length)}</b> öğretmen ·{" "}
                <b className="font-medium text-tx-metin">{subeler.length}</b> şube
              </>
            }
          />
        </div>

        <div className="mx-auto max-w-[900px] px-7 pb-16 pt-6">
          <p className="mb-6 max-w-[70ch] border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px]">
            Bu belge öğretmen adı içerir ve <b>iç kullanım içindir</b>. Kurum raporu
            toplulaştırılmıştır ve isim içermez; ikisini birlikte paylaşmak kurum raporunun
            taşıdığı gizlilik taahhüdünü geçersiz kılar.
          </p>

          {subeler.map(({ sube, rows, ort }) => (
            <section key={sube} className="mb-9">
              <h2 className="mb-3 flex items-baseline gap-2.5 font-baslik text-[17px] font-semibold">
                {sube}
                <span className="text-[12.5px] font-normal text-tx-gri">
                  {tr(rows.length)} öğretmen · ortalama %{ort}
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="border-b border-tx-siyah pb-2 pr-2.5 text-left text-[11.5px] font-medium text-tx-gri">Öğretmen</th>
                      <th className="border-b border-tx-siyah pb-2 pr-2.5 text-right text-[11.5px] font-medium text-tx-gri">Tamamladığı</th>
                      <th className="border-b border-tx-siyah pb-2 pr-2.5 text-right text-[11.5px] font-medium text-tx-gri">Devam eden</th>
                      <th className="border-b border-tx-siyah pb-2 pr-2.5 text-right text-[11.5px] font-medium text-tx-gri">Ortalama</th>
                      <th className="border-b border-tx-siyah pb-2 text-left text-[11.5px] font-medium text-tx-gri">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.eposta}-${i}`}>
                        <th className="border-b border-tx-cizgi py-2.5 pr-2.5 text-left font-normal">{r.ad}</th>
                        <td className="border-b border-tx-cizgi py-2.5 pr-2.5 text-right tabular-nums">{tr(r.tamamlanan)}</td>
                        <td className="border-b border-tx-cizgi py-2.5 pr-2.5 text-right tabular-nums">{tr(r.devamEden)}</td>
                        <td className={`border-b border-tx-cizgi py-2.5 pr-2.5 text-right font-semibold tabular-nums ${r.yuzde < 50 ? "text-tx-kirmizi" : ""}`}>
                          %{Math.round(r.yuzde)}
                        </td>
                        <td className="border-b border-tx-cizgi py-2.5 text-[11.5px] whitespace-nowrap">
                          {r.yuzde >= 100
                            ? "Tümünü tamamlamış"
                            : r.tamamlanan === 0 && r.yuzde <= 0
                              ? <span className="font-medium text-tx-kirmizi">Hiç başlamamış</span>
                              : "Devam ediyor"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
