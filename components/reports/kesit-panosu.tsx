"use client";

import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { excelOku, SUTUNLAR_DETAYLI, SUTUNLAR_OZET } from "./kesit-parse";
import { kesitUret, kesitUretOzet, type Kesit, type KesitKurum } from "./kesit";
import { KesitKarsilastirma } from "./kesit-karsilastirma";
import { YazdirButonu } from "./print-button";
import {
  UstSerit, RaporBasligi, Bolum, Pano, Kpi, Halka, YatayBarlar,
  DagilimGrafigi, Tablo, OranBari, Dipnot, tr,
} from "./brand";
import { formatDate } from "@/lib/utils";

type Gorunum = { tip: "karsilastirma" } | { tip: "kurum"; kurumAdi: string };

export function KesitPanosu() {
  const [kesit, setKesit] = useState<Kesit | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [kesitTarihi, setKesitTarihi] = useState(() => new Date().toISOString().slice(0, 10));
  const [kaynakSatir, setKaynakSatir] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>({ tip: "karsilastirma" });

  function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    setHata(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setDosyaAdi(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const sonuc = excelOku(ev.target?.result as ArrayBuffer);
        const k = sonuc.tip === "detayli"
          ? kesitUret(sonuc.satirlar, sonuc.olcekDuzeltildi)
          : kesitUretOzet(sonuc.satirlar);
        k.uyarilar.epostasizSatir = sonuc.epostasiz;
        setKaynakSatir(sonuc.kaynakSatir);
        setKesit(k);
        setGorunum({ tip: "karsilastirma" });
      } catch (err) {
        setKesit(null);
        setHata(err instanceof Error ? err.message : "Excel okunamadı.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function temizle() {
    setKesit(null); setDosyaAdi(""); setHata(null); setKaynakSatir(0);
    setGorunum({ tip: "karsilastirma" });
  }

  const secili = kesit && gorunum.tip === "kurum"
    ? kesit.kurumlar.find((k) => k.kurumAdi === gorunum.kurumAdi) ?? null
    : null;

  return (
    <div className="space-y-5">
      {/* --- yükleme --- */}
      <div className="ic-arac rounded-lg border border-tx-cizgi bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-tx-gri" />
          <h2 className="font-baslik text-base font-semibold text-tx-metin">Kesit Yükle</h2>
        </div>

        {!kesit ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-tx-cizgi py-8 text-center hover:border-tx-kirmizi">
            <FileSpreadsheet className="h-8 w-8 text-tx-cizgi" />
            <span className="text-sm text-tx-metin">.xlsx dosyasını seç — tüm kurumlar alt alta olabilir</span>
            <span className="text-xs text-tx-gri">Detaylı: {SUTUNLAR_DETAYLI}</span>
            <span className="text-xs text-tx-gri">Özet: {SUTUNLAR_OZET}</span>
            <span className="text-xs text-tx-gri">
              Dosya tarayıcıda işlenir. Kaydedilecek olan yalnızca kurum/şube/eğitim düzeyindeki
              sayılardır — ad, e-posta ve kişi bazlı ilerleme hiçbir yere yazılmaz.
            </span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={dosyaSecildi} />
          </label>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-tx-cizgi bg-tx-kagit px-4 py-3">
            <div className="text-sm">
              <p className="font-medium text-tx-metin">{dosyaAdi}</p>
              <p className="text-tx-gri">
                {tr(kaynakSatir)} satır · {kesit.kurumlar.length} kurum ·{" "}
                {tr(kesit.kurumlar.reduce((a, k) => a + k.ogretmenSayisi, 0))} öğretmen
              </p>
              <p className="mt-0.5 text-[11px] text-tx-gri">
                {kesit.kurumlar[0]?.kaynak === "ozet"
                  ? "Özet döküm — eğitim kırılımı ve sertifika bilgisi yok"
                  : "Detaylı döküm — eğitim kırılımı ve sertifika dahil"}
              </p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tx-kirmizi">
                  Kesit tarihi
                </label>
                <input
                  type="date"
                  value={kesitTarihi}
                  onChange={(e) => setKesitTarihi(e.target.value)}
                  className="h-9 rounded-md border border-tx-cizgi bg-white px-3 text-sm"
                />
              </div>
              <Button disabled title="Kaydetme Adım 2'de (şema) gelecek">Kaydet</Button>
              <button onClick={temizle} className="text-tx-gri hover:text-tx-metin" title="Vazgeç">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {hata && (
          <p className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-sm text-tx-metin">
            {hata}
          </p>
        )}

        {kesit && (kesit.uyarilar.epostasizSatir > 0 || kesit.uyarilar.birlestirilenMukerrer > 0 || kesit.uyarilar.olcekDuzeltildi) && (
          <div className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-[13px]">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> Veri notu</p>
            <ul className="ml-5 mt-1 list-disc space-y-0.5 text-xs text-tx-gri">
              {kesit.uyarilar.epostasizSatir > 0 && (
                <li><b className="text-tx-metin">{tr(kesit.uyarilar.epostasizSatir)}</b> satırda e-posta yok; kimlik e-posta olduğu için bu satırlar atlandı.</li>
              )}
              {kesit.uyarilar.birlestirilenMukerrer > 0 && (
                <li><b className="text-tx-metin">{tr(kesit.uyarilar.birlestirilenMukerrer)}</b> mükerrer kayıt (aynı öğretmen + aynı eğitim) birleştirildi; en yüksek ilerleme tutuldu.</li>
              )}
              {kesit.uyarilar.olcekDuzeltildi && <li>İlerleme sütunu 0–100 ölçeğindeydi, 0–1&apos;e çevrildi.</li>}
            </ul>
          </div>
        )}
      </div>

      {!kesit ? null : secili ? (
        <KurumDetay
          kurum={secili}
          tarih={formatDate(kesitTarihi)}
          onGeri={() => setGorunum({ tip: "karsilastirma" })}
        />
      ) : (
        <>
          <div className="ic-arac flex items-center justify-between gap-3">
            <div>
              <h2 className="font-baslik text-lg font-semibold text-tx-metin">Kurum Karşılaştırma</h2>
              <p className="text-[12.5px] text-tx-gri">
                Başlığa tıklayarak sıralayın · kurum adına tıklayarak detaya gidin
              </p>
            </div>
            <div className="w-72">
              <Select value="" onChange={(e) => e.target.value && setGorunum({ tip: "kurum", kurumAdi: e.target.value })}>
                <option value="">Kurum detayına git…</option>
                {kesit.kurumlar.map((k) => <option key={k.kurumAdi} value={k.kurumAdi}>{k.kurumAdi}</option>)}
              </Select>
            </div>
          </div>
          <KesitKarsilastirma
            kurumlar={kesit.kurumlar}
            onKurumSec={(kurumAdi) => setGorunum({ tip: "kurum", kurumAdi })}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ kurum detay --- */

export function KurumDetay({ kurum: k, tarih, onGeri }: { kurum: KesitKurum; tarih: string; onGeri: () => void }) {
  const yuzde = (n: number) => (k.ogretmenSayisi ? Math.round((n / k.ogretmenSayisi) * 100) : 0);

  // Kümülatif sertifika eğrisi
  const kumulatif = useMemo(() => {
    let t = 0;
    return k.sertifikaAylik.map((s) => {
      t += s.adet;
      const [yil, ay] = s.ay.split("-");
      return { etiket: `${ay}.${yil.slice(2)}`, deger: t };
    });
  }, [k.sertifikaAylik]);

  return (
    <div className="overflow-hidden rounded-lg border border-tx-cizgi bg-tx-kagit font-govde text-tx-metin print:rounded-none print:border-0">
      <div className="ic-arac flex items-center justify-between gap-3 border-b border-tx-cizgi bg-white px-7 py-2.5">
        <button onClick={onGeri} className="inline-flex items-center gap-1.5 text-sm text-tx-gri hover:text-tx-metin">
          <ArrowLeft className="h-4 w-4" /> Kurum Karşılaştırma
        </button>
        <YazdirButonu mod="kurum" etiket="Kurum Raporu (PDF)" />
      </div>

      <div className="yalniz-kurum">
        <UstSerit tarih={tarih} />
        <RaporBasligi
          kurum={k.kurumAdi}
          altBaslik="TeacherX Eğitim Tamamlama Raporu"
          meta={
            <>
              <b className="font-medium text-tx-metin">{tr(k.ogretmenSayisi)}</b> öğretmen ·{" "}
              <b className="font-medium text-tx-metin">{tr(k.subeSayisi)}</b> şube ·{" "}
<b className="font-medium text-tx-metin">{k.egitimSayisi === null ? "—" : tr(k.egitimSayisi)}</b> atanan eğitim
            </>
          }
        />

        <main className="mx-auto max-w-[900px] px-7 pb-16 pt-10">
          <Pano>
            <Kpi etiket="Öğretmen sayısı" deger={tr(k.ogretmenSayisi)} />
            <Kpi etiket="Atanan eğitim sayısı" deger={k.egitimSayisi === null ? "—" : tr(k.egitimSayisi)} alt={`${tr(k.kayitSayisi)} kayıt`} />
            <Kpi etiket="İlerleme ortalaması" deger={`%${k.ilerlemeOrtalamasi.toFixed(1)}`} alt="kısmi ilerleme sayılır" vurgu />
            <Kpi etiket="Tamamlanma oranı" deger={`%${k.tamamlanmaOrani.toFixed(1)}`} alt={`${tr(k.tamamlananEgitim)} eğitim bitti`} />
          </Pano>
          <Pano sutun={3}>
            <Kpi etiket="Hiç başlamayan öğretmen" deger={tr(k.hicBaslamayan)} alt={`öğretmenlerin %${yuzde(k.hicBaslamayan)}'i`} vurgu={k.hicBaslamayan > 0} />
            <Kpi etiket="Devam eden öğretmen" deger={tr(k.devamEden)} alt={`öğretmenlerin %${yuzde(k.devamEden)}'i`} />
            <Kpi etiket="Tümünü tamamlayan öğretmen" deger={tr(k.tumunuTamamlayan)} alt={`öğretmenlerin %${yuzde(k.tumunuTamamlayan)}'i`} />
          </Pano>

          <div className="mt-6">
            <Halka
              ortaDeger={tr(k.ogretmenSayisi)}
              ortaEtiket="öğretmen"
              dilimler={[
                { ad: "Hiç başlamamış", deger: k.hicBaslamayan, renk: "#101010" },
                { ad: "Devam ediyor", deger: k.devamEden, renk: "#C9C5BE" },
                { ad: "Tümünü tamamlamış", deger: k.tumunuTamamlayan, renk: "#E70917" },
              ]}
            />
          </div>

          {k.esitsizAtama > 0 && (
            <p className="mt-4 rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-2.5 text-[12.5px]">
              <b>{tr(k.esitsizAtama)}</b> öğretmene diğerlerinden farklı sayıda eğitim atanmış.
              Ortalamalar öğretmen düzeyinden hesaplandığı için bu, satır düzeyinde hesaplayan
              Excel&apos;e göre küçük bir sapma yaratır.
            </p>
          )}

          <div className="h-11" />

          <Bolum baslik="Şubeler" aciklama="Şube ortalamaları. Kurum ortalaması şube ortalamalarının ortalaması değildir; öğretmen düzeyinden hesaplanır.">
            <YatayBarlar satirlar={k.subeler.map((s) => ({
              ad: s.subeAdi, oran: s.ilerlemeOrtalamasi, deger: `%${Math.round(s.ilerlemeOrtalamasi)}`,
            }))} />
            <Tablo basliklar={["Şube", "Öğretmen", "İlerleme Ort.", "Tamamlanma", "Hiç Başlamayan", "Tümünü Bitiren"]}>
              {k.subeler.map((s) => (
                <tr key={s.subeAdi}>
                  <th className="border-b border-tx-cizgi py-3 pr-2.5 text-left font-medium">{s.subeAdi}</th>
                  <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(s.ogretmenSayisi)}</td>
                  <td className={`border-b border-tx-cizgi py-3 pr-2.5 text-right font-semibold tabular-nums ${s.ilerlemeOrtalamasi < 50 ? "text-tx-kirmizi" : ""}`}>%{s.ilerlemeOrtalamasi.toFixed(1)}</td>
                  <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">%{s.tamamlanmaOrani.toFixed(1)}</td>
                  <td className={`border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums ${s.hicBaslamayan > 0 ? "text-tx-kirmizi" : ""}`}>{tr(s.hicBaslamayan)}</td>
                  <td className="border-b border-tx-cizgi py-3 text-right tabular-nums">{tr(s.tumunuTamamlayan)}</td>
                </tr>
              ))}
            </Tablo>
          </Bolum>

          {k.egitimler.length > 0 && (
          <Bolum baslik="Eğitimler" aciklama="Eğitim bazında tamamlanma oranı — en düşük üstte.">
            <Tablo basliklar={["Eğitim", "Atanan", "Tamamlayan", "Hiç Başlamayan", "", "Oran"]}>
              {k.egitimler.map((e) => (
                <tr key={e.egitimAdi}>
                  <th className="border-b border-tx-cizgi py-3 pr-2.5 text-left font-medium">{e.egitimAdi}</th>
                  <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(e.atananOgretmen)}</td>
                  <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(e.tamamlayan)}</td>
                  <td className="border-b border-tx-cizgi py-3 pr-2.5 text-right tabular-nums">{tr(e.hicBaslamayan)}</td>
                  <td className="w-[26%] border-b border-tx-cizgi py-3 pr-2.5"><OranBari oran={e.tamamlanmaOrani} /></td>
                  <td className={`border-b border-tx-cizgi py-3 text-right font-semibold tabular-nums ${e.tamamlanmaOrani < 50 ? "text-tx-kirmizi" : ""}`}>%{Math.round(e.tamamlanmaOrani)}</td>
                </tr>
              ))}
            </Tablo>
          </Bolum>
          )}

          {k.kaynak === "ozet" && (
            <p className="mb-11 rounded border-l-[3px] border-tx-cizgi bg-white px-4 py-3 text-[12.5px] text-tx-gri">
              Bu kesit <b className="text-tx-metin">özet dökümden</b> üretildi. Eğitim adı ve sertifika
              tarihi içermediği için eğitim kırılımı, sertifika sayıları ve kümülatif sertifika eğrisi
              çıkarılamıyor. Bunlar için detaylı dökümü yükleyin.
            </p>
          )}

          {kumulatif.length > 1 && (
            <Bolum baslik="Kümülatif sertifika" aciklama="Sertifika tarihlerinden türetildi; kayıt tutmaya başlamadan önceki geçmişi de gösterir.">
              <DagilimGrafigi sutunlar={kumulatif} />
            </Bolum>
          )}

          <Dipnot>
            Bu rapor {tarih} tarihli TeacherX platform dökümünden üretilmiştir. Toplulaştırılmıştır;
            öğretmen adı, e-posta veya kişi bazlı performans bilgisi içermez.
          </Dipnot>
        </main>
      </div>
    </div>
  );
}
