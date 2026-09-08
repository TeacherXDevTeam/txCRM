"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import { YazdirButonu } from "./print-button";
import type { TeacherKurumStats, TeacherRow } from "./teacher-report-client";
import { TeacherListesi } from "./teacher-list-view";
import {
  UstSerit, RaporBasligi, Bolum, Pano, Kpi, Halka, YatayBarlar,
  DagilimGrafigi, Tablo, Dipnot, tr,
} from "./brand";

interface KurumEntry { kurum: string; teacher_count: number; stats: TeacherKurumStats }
interface Props {
  kurumStats: KurumEntry[];
  expectedByKurum: Record<string, number>;
  uploadInfo: { dosya_adi: string | null; uploaded_at: string; satir_sayisi: number } | null;
  /** Bu oturumda yüklenen ham satırlar — yalnızca öğretmen listesi için, DB'ye yazılmaz. */
  oturumSatirlari: TeacherRow[];
}

const normKurum = (s: string) => s.toLowerCase().trim();

export function TeacherReportDashboard({
  kurumStats, expectedByKurum, uploadInfo, oturumSatirlari,
}: Props) {
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

  // Eski yüklemelerde gruplar alanı yok → sayılardan türet
  const gruplar = s.gruplar ?? {
    hicBaslamayan: s.notStarted,
    devamEden: Math.max(0, s.teacherCount - s.notStarted - s.fullyCompleted),
    tumunuTamamlayan: s.fullyCompleted,
  };
  const yuzde = (n: number) => (s.teacherCount ? Math.round((n / s.teacherCount) * 100) : 0);

  const kurumSatirlari = oturumSatirlari.filter((r) => (r.kurum || "—") === kurum);
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
            <b className="font-medium text-tx-metin">{tr(s.enrollments)}</b> kurs kaydı
          </>
        }
      />

      {/* --- iç araçlar: kurum seçici + çıktı butonları (çıktıda görünmez) --- */}
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
          <div className="flex items-center gap-2">
            <YazdirButonu mod="kurum" etiket="Kurum Raporu (PDF)" />
            {kurumSatirlari.length > 0 && (
              <YazdirButonu mod="liste" etiket="Öğretmen Listesi (PDF)" ikincil />
            )}
          </div>
        </div>
        {uploadInfo && (
          <p className="mt-2 text-[11.5px] text-tx-gri">
            Kaynak: {uploadInfo.dosya_adi} · {new Date(uploadInfo.uploaded_at).toLocaleString("tr-TR")} ·{" "}
            {tr(uploadInfo.satir_sayisi)} öğretmen
          </p>
        )}
        {kurumSatirlari.length === 0 && (
          <p className="mt-1 text-[11.5px] text-tx-gri">
            İsimli <b className="font-medium text-tx-metin">Öğretmen Listesi</b> çıktısı için Excel&apos;i bu oturumda
            yeniden yükleyin — isimler kaydedilmediği için sayfa yenilendiğinde liste kaybolur. Kurum raporu
            kayıtlı özetten üretildiği için her zaman hazırdır.
          </p>
        )}
      </div>

      <main className="mx-auto max-w-[900px] px-7 pb-16 pt-10">
        {/* KPI */}
        <Pano>
          <Kpi etiket="Öğretmen sayısı" deger={tr(s.teacherCount)} />
          <Kpi etiket="Toplam kurs kaydı" deger={tr(s.enrollments)} alt={`kişi başı ${s.avgCoursesPerTeacher}`} />
          <Kpi etiket="Kurum genel ortalaması" deger={`%${s.avgCompletion}`} alt={`medyan %${s.medianCompletion}`} vurgu />
          <Kpi etiket="Kurs bazlı tamamlama" deger={`%${s.weightedCompletion}`} alt={`${tr(s.totalCompleted)}/${tr(s.enrollments)} kurs`} />
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

        <Bolum baslik="Kaç kurs tamamlandı"
               aciklama="Öğretmenlerin kaçının kaç kurs bitirdiği. Sağdaki sütun tamamı bitirenleri gösterir.">
          <DagilimGrafigi sutunlar={s.countBuckets.map((b) => ({ etiket: `${b.aralik} kurs`, deger: b.sayi }))} />
        </Bolum>

        <Bolum baslik="Tamamlama dağılımı"
               aciklama="Öğretmenlerin tamamlama yüzdelerine göre dağılımı.">
          <DagilimGrafigi sutunlar={s.pctBuckets.map((b) => ({ etiket: b.aralik, deger: b.sayi }))} />
        </Bolum>

        <Bolum baslik="Şubeler"
               aciklama="Şube ortalamaları. Kurum ortalaması, şube ortalamalarının ortalaması değildir; öğretmen düzeyinden hesaplanır.">
          <YatayBarlar
            satirlar={s.subeler.map((b) => ({ ad: b.sube, oran: b.ort, deger: `%${b.ort}` }))}
          />
          <Tablo basliklar={["Şube", "Öğretmen", "Ortalama", "Tümünü bitiren", "Tamamlanan kurs"]}>
            {s.subeler.map((b) => (
              <tr key={b.sube}>
                <th className="border-b border-tx-cizgi py-3 pr-2.5 text-left font-medium">{b.sube}</th>
                <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(b.ogretmen)}</td>
                <td className={`border-b border-tx-cizgi py-3 pr-2.5 text-right font-semibold tabular-nums ${b.ort < 50 ? "text-tx-kirmizi" : ""}`}>%{b.ort}</td>
                <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(b.bitiren)}</td>
                <td className="border-b border-tx-cizgi py-3 text-right tabular-nums">{tr(b.tamamlananKurs)}</td>
              </tr>
            ))}
          </Tablo>
        </Bolum>

        <Dipnot>
          Bu rapor {tarih} tarihli TeacherX platform dökümünden üretilmiştir. Toplulaştırılmıştır;
          öğretmen adı, e-posta veya kişi bazlı performans bilgisi içermez. Kurum genel ortalaması
          öğretmen düzeyinden hesaplanır.
        </Dipnot>

        {/* --- yalnızca ekranda: iç değerlendirme --- */}
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

          {(s.pctMismatch > 0 || s.mergedDuplicates > 0) && (
            <div className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-semibold"><Info className="h-4 w-4" /> Veri notu</p>
              <ul className="ml-5 mt-1 list-disc space-y-0.5 text-xs text-tx-gri">
                {s.pctMismatch > 0 && (
                  <li>
                    <b className="text-tx-metin">{tr(s.pctMismatch)}</b> öğretmende platformun verdiği tamamlama yüzdesi,
                    tamamlanan/devam eden adetlerinden hesaplanana uymuyor. Genellikle henüz başlanmamış kursların
                    &quot;Devam Eden&quot;e dahil edilmediği anlamına gelir. KPI&apos;larda platformun yüzdesi esas alındı.
                  </li>
                )}
                {s.mergedDuplicates > 0 && (
                  <li><b className="text-tx-metin">{tr(s.mergedDuplicates)}</b> tekrar eden öğretmen satırı tek kayıtta birleştirildi.</li>
                )}
              </ul>
            </div>
          )}

          <RiskListesi risk={s.risk} />
        </div>
      </main>
      </div>

      {/* --- öğretmen listesi: ayrı çıktı, isim içerir --- */}
      {kurumSatirlari.length > 0 && (
        <TeacherListesi kurum={kurum} tarih={tarih} satirlar={kurumSatirlari} />
      )}
    </div>
  );
}

function RiskListesi({ risk }: { risk: TeacherKurumStats["risk"] }) {
  if (risk.length === 0) {
    return (
      <div className="rounded border border-tx-cizgi bg-white px-4 py-6 text-center text-sm text-tx-gri">
        Tamamlaması %50&apos;nin altında öğretmen yok.
      </div>
    );
  }
  return (
    <div className="rounded border border-tx-cizgi bg-white p-4">
      <h3 className="mb-1 font-baslik text-sm font-semibold">
        Risk listesi (tamamlama &lt; %50) — {risk.length}{risk.length === 50 ? "+" : ""} öğretmen
      </h3>
      <p className="mb-3 text-[11.5px] text-tx-gri">
        İç kullanım. Bu bölüm kurum raporu çıktısına <b>girmez</b>.
      </p>
      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        {risk.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-tx-cizgi py-1.5 text-sm">
            <span className="truncate">{r.ad}</span>
            <span className="flex shrink-0 items-center gap-2">
              {r.sube && <span className="text-xs text-tx-gri">{r.sube}</span>}
              <span className="text-xs tabular-nums text-tx-gri">{r.tamamlanan}/{r.tamamlanan + r.devamEden}</span>
              <span className="w-10 text-right font-semibold tabular-nums text-tx-kirmizi">%{r.yuzde}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
