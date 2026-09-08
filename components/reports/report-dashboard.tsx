"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { YazdirButonu } from "./print-button";
import type { KurumStats } from "./report-client";
import {
  UstSerit, RaporBasligi, Bolum, Pano, Kpi, Halka, YatayBarlar,
  DagilimGrafigi, Tablo, OranBari, Dipnot, tr,
} from "./brand";

interface KurumEntry { kurum: string; teacher_count: number; stats: KurumStats }
interface Props {
  kurumStats: KurumEntry[];
  expectedByKurum: Record<string, number>;
  uploadInfo: { dosya_adi: string | null; uploaded_at: string; satir_sayisi: number } | null;
}

const normKurum = (s: string) => s.toLowerCase().trim();

export function ReportDashboard({ kurumStats, expectedByKurum, uploadInfo }: Props) {
  const kurumlar = useMemo(
    () => kurumStats.map((k) => k.kurum).sort((a, b) => a.localeCompare(b, "tr")),
    [kurumStats]
  );
  const [kurum, setKurum] = useState(kurumlar[0] ?? "");

  const entry = kurumStats.find((k) => k.kurum === kurum);
  const s = entry?.stats;
  if (!s) return null;

  const expected = expectedByKurum[normKurum(kurum)] ?? null;
  const coverage = expected ? Math.round((s.teacherCount / expected) * 100) : null;

  // Eski yüklemelerde gruplar alanı yok → eldeki sayılardan türet
  const gruplar = s.gruplar ?? {
    hicBaslamayan: 0,
    devamEden: Math.max(0, s.teacherCount - s.fullyCompleted),
    tumunuTamamlayan: s.fullyCompleted,
  };
  const yuzde = (n: number) => (s.teacherCount ? Math.round((n / s.teacherCount) * 100) : 0);
  const tarih = new Date(uploadInfo?.uploaded_at ?? Date.now()).toLocaleDateString("tr-TR");

  return (
    <div className="overflow-hidden rounded-lg border border-tx-cizgi bg-tx-kagit font-govde text-tx-metin print:rounded-none print:border-0">
      <div className="yalniz-kurum">
      <UstSerit tarih={tarih} />
      <RaporBasligi
        kurum={kurum}
        altBaslik="TeacherX Eğitim Tamamlama Raporu"
        meta={
          <>
            <b className="font-medium text-tx-metin">{tr(s.teacherCount)}</b> öğretmen ·{" "}
            <b className="font-medium text-tx-metin">{tr(s.subeler.length)}</b> şube ·{" "}
            <b className="font-medium text-tx-metin">{tr(s.courseCount)}</b> atanan eğitim
          </>
        }
      />

      <div className="ic-arac mx-auto max-w-[900px] px-7 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded border border-tx-cizgi bg-white px-4 py-3">
          <div className="w-72">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tx-kirmizi">
              Kurum ({kurumlar.length})
            </label>
            <Select value={kurum} onChange={(e) => setKurum(e.target.value)}>
              {kurumlar.map((kk) => <option key={kk} value={kk}>{kk}</option>)}
            </Select>
          </div>
          <YazdirButonu mod="kurum" etiket="Kurum Raporu (PDF)" />
        </div>
        {uploadInfo && (
          <p className="mt-2 text-[11.5px] text-tx-gri">
            Kaynak: {uploadInfo.dosya_adi} · {new Date(uploadInfo.uploaded_at).toLocaleString("tr-TR")} ·{" "}
            {tr(uploadInfo.satir_sayisi)} kayıt
          </p>
        )}
      </div>

      <main className="mx-auto max-w-[900px] px-7 pb-16 pt-10">
        <Pano>
          <Kpi etiket="Öğretmen sayısı" deger={tr(s.teacherCount)} />
          <Kpi etiket="Atanan eğitim sayısı" deger={tr(s.courseCount)} />
          <Kpi etiket="Kurum genel ortalaması" deger={`%${s.avgCompletion}`} vurgu />
          <Kpi etiket="Sertifika alan öğretmen" deger={tr(s.certCount)} alt="tamamlanan eğitim başına" />
        </Pano>
        <Pano sutun={3}>
          <Kpi etiket="Hiç başlamayan öğretmen" deger={tr(gruplar.hicBaslamayan)} alt={`öğretmenlerin %${yuzde(gruplar.hicBaslamayan)}'i`} vurgu={gruplar.hicBaslamayan > 0} />
          <Kpi etiket="Devam eden öğretmen" deger={tr(gruplar.devamEden)} alt={`öğretmenlerin %${yuzde(gruplar.devamEden)}'i`} />
          <Kpi etiket="Tümünü tamamlayan öğretmen" deger={tr(gruplar.tumunuTamamlayan)} alt={`öğretmenlerin %${yuzde(gruplar.tumunuTamamlayan)}'i`} />
        </Pano>

        <div className="mt-6">
          <Halka
            ortaDeger={tr(s.teacherCount)}
            ortaEtiket="öğretmen"
            dilimler={[
              { ad: "Hiç başlamamış", deger: gruplar.hicBaslamayan, renk: "#101010" },
              { ad: "Devam ediyor", deger: gruplar.devamEden, renk: "#C9C5BE" },
              { ad: "Tümünü tamamlamış", deger: gruplar.tumunuTamamlayan, renk: "#E70917" },
            ]}
          />
        </div>

        <div className="h-11" />

        <Bolum baslik="Kaç eğitim tamamlandı"
               aciklama="Öğretmenlerin kaçının kaç eğitim bitirdiği. Sağdaki sütun tamamı bitirenleri gösterir.">
          <DagilimGrafigi sutunlar={s.buckets.map((b) => ({ etiket: `${b.aralik} eğitim`, deger: b.sayi }))} />
        </Bolum>

        <Bolum baslik="Şubeler"
               aciklama="Şube ortalamaları. Kurum ortalaması, şube ortalamalarının ortalaması değildir; öğretmen düzeyinden hesaplanır.">
          <YatayBarlar satirlar={s.subeler.map((b) => ({ ad: b.sube, oran: b.ort, deger: `%${b.ort}` }))} />
          <Tablo basliklar={["Şube", "Öğretmen", "Ortalama", "Tümünü bitiren"]}>
            {s.subeler.map((b) => (
              <tr key={b.sube}>
                <th className="border-b border-tx-cizgi py-3 pr-2.5 text-left font-medium">{b.sube}</th>
                <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(b.ogretmen)}</td>
                <td className={`border-b border-tx-cizgi py-3 pr-2.5 text-right font-semibold tabular-nums ${b.ort < 50 ? "text-tx-kirmizi" : ""}`}>%{b.ort}</td>
                <td className="border-b border-tx-cizgi py-3 text-right tabular-nums">%{b.tamRate}</td>
              </tr>
            ))}
          </Tablo>
        </Bolum>

        <Bolum baslik="Eğitimler"
               aciklama="Eğitim bazında tamamlanma oranı — en düşük üstte.">
          <Tablo basliklar={["Eğitim", "Atanan", "Tamamlayan", "", "Oran"]}>
            {s.kurslar.map((k) => (
              <tr key={k.kurs}>
                <th className="border-b border-tx-cizgi py-3 pr-2.5 text-left font-medium">{k.kurs || "—"}</th>
                <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(k.atanan)}</td>
                <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(k.tamamlayan)}</td>
                <td className="w-[30%] border-b border-tx-cizgi py-3 pr-2.5"><OranBari oran={k.oran} /></td>
                <td className={`border-b border-tx-cizgi py-3 text-right font-semibold tabular-nums ${k.oran < 50 ? "text-tx-kirmizi" : ""}`}>%{k.oran}</td>
              </tr>
            ))}
          </Tablo>
        </Bolum>

        <Dipnot>
          Bu rapor {tarih} tarihli TeacherX platform dökümünden üretilmiştir. Toplulaştırılmıştır;
          öğretmen adı, e-posta veya kişi bazlı performans bilgisi içermez. Kurum genel ortalaması
          öğretmen düzeyinden hesaplanır.
        </Dipnot>

        <div className="ic-arac mt-10 space-y-4">
          {expected !== null ? (
            <div className={`rounded border-l-[3px] bg-white px-4 py-3 text-sm ${s.teacherCount >= expected ? "border-tx-siyah" : "border-tx-kirmizi"}`}>
              Sözleşmeye göre <b>{tr(expected)}</b> öğretmen olmalı, raporda <b>{tr(s.teacherCount)}</b> var
              {s.teacherCount < expected
                ? <> → <b>{tr(expected - s.teacherCount)}</b> öğretmen eksik (%{coverage} kapsama).</>
                : <> → hedef karşılanıyor (%{coverage}).</>}
            </div>
          ) : (
            <div className="rounded border border-tx-cizgi bg-white px-4 py-3 text-sm text-tx-gri">
              Bu kurum için sözleşmede &quot;olması gereken öğretmen sayısı&quot; tanımlı değil (kurum adı eşleşmedi).
            </div>
          )}

          <div className="rounded border border-tx-cizgi bg-white p-4">
            <h3 className="mb-1 font-baslik text-sm font-semibold">
              Risk listesi (tamamlama &lt; %50) — {s.risk.length} öğretmen
            </h3>
            <p className="mb-3 text-[11.5px] text-tx-gri">
              İç kullanım. Bu bölüm kurum raporu çıktısına <b>girmez</b>.
            </p>
            {s.risk.length === 0 ? (
              <p className="py-3 text-center text-sm text-tx-gri">Düşük tamamlamalı öğretmen yok.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                {s.risk.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-tx-cizgi py-1.5 text-sm">
                    <span className="truncate">{r.ad}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {r.sube && <span className="text-xs text-tx-gri">{r.sube}</span>}
                      <span className="w-10 text-right font-semibold tabular-nums text-tx-kirmizi">%{r.yuzde}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
