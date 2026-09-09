"use client";

import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { excelOku, SUTUNLAR_DETAYLI, SUTUNLAR_OZET } from "./kesit-parse";
import { kesitUret, kesitUretOzet, kurumlariBirlestir, TUMU_ADI, type Kesit, type KesitKurum } from "./kesit";
import { KesitKarsilastirma } from "./kesit-karsilastirma";
import { KesitSubeAnalizi } from "./kesit-sube-analizi";
import { KesitEgitimAnalizi } from "./kesit-egitim-analizi";
import { KesitDagilim } from "./kesit-dagilim";
import { KesitAylikTakip } from "./kesit-aylik-takip";
import { KesitListesi } from "./kesit-liste";
import type { Trend } from "./kesit-trend";
import { YazdirButonu } from "./print-button";
import {
  UstSerit, RaporBasligi, Bolum, Pano, Kpi, Halka, YatayBarlar,
  DagilimGrafigi, Tablo, OranBari, Dipnot, tr,
} from "./brand";
import { formatDate } from "@/lib/utils";
import { KesitEslestirme, type Karar } from "./kesit-eslestirme";
import { kesitKaydet, okulOlustur, type OkulDurumu } from "./kesit-db";
import type { KayitliKesit } from "./kesit-map";
import {
  kararlariHazirla, ilgiGerekenSayisi,
  type OkulAdayi, type OncekiKarar,
} from "./kurum-eslestir";
import { useRouter } from "next/navigation";

type Sayfa = "karsilastirma" | "sube" | "egitim" | "aylik" | "kesitler";
type Gorunum = { tip: Sayfa } | { tip: "kurum"; kurumAdi: string };

const SAYFALAR: { key: Sayfa; ad: string }[] = [
  { key: "karsilastirma", ad: "Kurum Karşılaştırma" },
  { key: "sube",          ad: "Şube Analizi" },
  { key: "egitim",        ad: "Eğitim Analizi" },
  { key: "aylik",         ad: "Aylık Takip" },
  { key: "kesitler",      ad: "Kesitler" },
];

interface PanoProps {
  kullaniciId: string;
  okullar: OkulAdayi[];
  kayitli: KayitliKesit | null;
  /** Kaydedilmiş tüm kesitlerin zaman serisi — Aylık Takip sekmesi */
  trend: Trend | null;
  /** Kurum adı → önceki kesitlerde verilmiş eşleştirme kararı */
  oncekiKararlar: Record<string, OncekiKarar>;
  /** Şema uygulanmamışsa sunucudan gelen hata */
  semaHatasi: string | null;
}

export function KesitPanosu({ kullaniciId, okullar, kayitli, trend, oncekiKararlar, semaHatasi }: PanoProps) {
  const router = useRouter();
  // Kaydedilmiş kesit varsa onunla açılır; yükleme yapılınca üzerine yazılır.
  const [kesit, setKesit] = useState<Kesit | null>(
    kayitli ? { kurumlar: kayitli.kurumlar, uyarilar: { epostasizSatir: 0, birlestirilenMukerrer: 0, olcekDuzeltildi: false } } : null
  );
  const [kayitliMi, setKayitliMi] = useState(kayitli !== null);
  const [dosyaAdi, setDosyaAdi] = useState(kayitli?.dosyaAdi ?? "");
  const [kesitTarihi, setKesitTarihi] = useState(kayitli?.kesitTarihi ?? new Date().toISOString().slice(0, 10));
  const [kaynakSatir, setKaynakSatir] = useState(kayitli?.kaynakSatir ?? 0);
  const [hata, setHata] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>({ tip: "karsilastirma" });
  const [eslestirmede, setEslestirmede] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kayitHatasi, setKayitHatasi] = useState<string | null>(null);
  /**
   * Eşleştirme ekranı atlandıysa neyin hatırlandığı — yalnız "kaç kurum" demek
   * yetmiyor: bağlanmamış kurumların verisi Okullar tarafında görünmez ve
   * kullanıcı bunu ekran atlandığı için hiç fark etmeyebilir.
   */
  /** Üzerine yazma açıkça onaylandı mı — çakışan tarihte Kaydet'i açan tek şey. */
  const [uzerineYazOnayi, setUzerineYazOnayi] = useState(false);
  const [atlandiBilgisi, setAtlandiBilgisi] =
    useState<{ toplam: number; bagli: number; baglanmamis: number } | null>(null);

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
        setKayitliMi(false);
        /*
         * Tarih, kayıtlı kesitin tarihiyle açılıyor. Yeni bir dosya
         * seçildiğinde o tarihte bırakmak tehlikeli: kullanıcı tarihi
         * değiştirmeyi unutursa kaydetme, aynı tarihli mevcut kesiti SİLİP
         * yerine bunu yazar (kesitKaydet önce delete ediyor). Geçmiş dönem
         * dosyası yüklerken tam da bu olurdu. Bugüne çekiliyor.
         */
        setKesitTarihi(new Date().toISOString().slice(0, 10));
        setUzerineYazOnayi(false);
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
    setKayitliMi(false); setGorunum({ tip: "karsilastirma" });
  }

  async function kaydet(kararlar: Record<string, Karar>) {
    if (!kesit) return;
    setKaydediliyor(true); setKayitHatasi(null);
    try {
      /*
       * Yeni okulun durumu, kaydedilen kesitin GÜNCEL olup olmadığına bakar.
       * Geçmiş dönem raporundan açılan bir okulu "aktif" saymak yanlış:
       * o kurumla artık çalışılmıyor olabilir. Güncel kesitte görülen kurum
       * ise fiilen aktif.
       */
      const enSonKesit = (trend?.kesitler ?? []).reduce<string | null>(
        (a, k) => (a === null || k.tarih > a ? k.tarih : a), null);
      const yeniOkulDurumu: OkulDurumu =
        enSonKesit === null || kesitTarihi >= enSonKesit ? "aktif" : "potansiyel";

      // Önce yeni okullar açılır; id'leri bağlantı haritasına girer
      const baglantilar: Record<string, string | null> = {};
      for (const [kurumAdi, karar] of Object.entries(kararlar)) {
        if (karar.tip === "okul") baglantilar[kurumAdi] = karar.schoolId;
        else if (karar.tip === "yeni") baglantilar[kurumAdi] = await okulOlustur(kurumAdi, karar.sehir.trim(), yeniOkulDurumu);
        else baglantilar[kurumAdi] = null;
      }

      await kesitKaydet({
        kesit, kesitTarihi, dosyaAdi, kaynakSatir,
        kullaniciId: kullaniciId, okulBaglantilari: baglantilar,
      });

      setEslestirmede(false);
      setKayitliMi(true);
      router.refresh();
    } catch (e) {
      setKayitHatasi(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setKaydediliyor(false);
    }
  }

  /**
   * Kaydet'e basınca eşleştirme ekranı YALNIZCA sorulacak bir şey varsa açılır.
   * Aynı rapor her ay yeniden yükleniyor; tüm kurumların kararı hatırlanmışsa
   * 92 satırlık listeyi tekrar onaylatmak boşuna bir adım olur. Ekrana yine de
   * "Eşleştirme" düğmesiyle elle girilebilir.
   */
  function kaydetmeyeBasla() {
    setKayitHatasi(null);
    if (!kesit) return;
    const subeAdlari = new Map(kesit.kurumlar.map((k) => [k.kurumAdi, k.subeler.map((s) => s.subeAdi)]));
    const hazir = kararlariHazirla(
      kesit.kurumlar.map((k) => k.kurumAdi), okullar, subeAdlari, oncekiKararlar);

    if (ilgiGerekenSayisi(hazir.durumlar) === 0) {
      const kararListesi = Object.values(hazir.kararlar);
      setAtlandiBilgisi({
        toplam: kararListesi.length,
        bagli: kararListesi.filter((k) => k.tip === "okul").length,
        baglanmamis: kararListesi.filter((k) => k.tip !== "okul").length,
      });
      void kaydet(hazir.kararlar);
    } else {
      setAtlandiBilgisi(null);
      setEslestirmede(true);
    }
  }

  // TÜMÜ seçilirse kurumlar tek bir toplam "kurum"a indirgenir (Adım 8).
  // useMemo: 92 kurumun eğitim birleşimi her render'da yeniden hesaplanmasın.
  const tumu = useMemo(
    () => (kesit ? kurumlariBirlestir(kesit.kurumlar) : null),
    [kesit]
  );

  /** Seçilen tarihte zaten kayıtlı bir kesit var mı — varsa üzerine yazılır. */
  const cakisanKesit = (trend?.kesitler ?? []).find((k) => k.tarih === kesitTarihi) ?? null;

  const secili = kesit && gorunum.tip === "kurum"
    ? (gorunum.kurumAdi === TUMU_ADI
        ? tumu
        : kesit.kurumlar.find((k) => k.kurumAdi === gorunum.kurumAdi) ?? null)
    : null;

  return (
    <div className="space-y-5">
      {semaHatasi && (
        <div className="ic-arac rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px]">
          <p className="font-semibold">Veritabanı tabloları bulunamadı</p>
          <p className="mt-1 text-tx-gri">
            Kesit tabloları henüz oluşturulmamış. <code className="rounded bg-tx-kagit px-1">supabase/migrations/20260909000000_kesit_tablolari.sql</code>
            dosyasını Supabase SQL Editor&apos;de çalıştırın. O zamana kadar yükleme yapılabilir ama kaydedilemez.
          </p>
          <p className="mt-1 text-[11.5px] text-tx-gri">Sunucu mesajı: {semaHatasi}</p>
        </div>
      )}

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
                  onChange={(e) => { setKesitTarihi(e.target.value); setUzerineYazOnayi(false); }}
                  className="h-9 rounded-md border border-tx-cizgi bg-white px-3 text-sm"
                />
              </div>
              {/*
                kayitliMi ile KAPATILMAZ. Kayıtlı bir kesit varken eşleştirmeyi
                düzeltmek tam da gereken şey; kapatılırsa kullanıcı yanlış bir
                eşleştirmeyi ancak Excel'i yeniden yükleyerek düzeltebilir.
                Yeniden kaydetmek zararsız: aynı tarihli kesit silinip yazılır.
              */}
              <button
                onClick={() => { setKayitHatasi(null); setAtlandiBilgisi(null); setEslestirmede(true); }}
                disabled={kaydediliyor || (!kayitliMi && !!cakisanKesit && !uzerineYazOnayi)}
                className="h-9 rounded-md border border-tx-cizgi bg-white px-3 text-sm text-tx-gri hover:text-tx-metin disabled:opacity-50"
              >
                {kayitliMi ? "Eşleştirmeyi düzelt" : "Eşleştirme"}
              </button>
              {/*
                Çakışan tarihte Kaydet KAPALI. Uyarı yetmedi: kullanıcı geçmiş
                dönem dosyasını bugünün tarihiyle kaydedip güncel kesiti
                sildi. Kaza olabilecek bir şey, bilinçli bir onay gerektirmeli.
              */}
              <Button onClick={kaydetmeyeBasla}
                      disabled={kayitliMi || kaydediliyor || (!!cakisanKesit && !uzerineYazOnayi)}>
                {kaydediliyor ? "Kaydediliyor..." : kayitliMi ? "Kaydedildi" : "Kaydet"}
              </Button>
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

        {kesit && cakisanKesit && !kayitliMi && (
          <div className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2.5 text-[13px] text-tx-metin">
            <p>
              <b className="font-medium">{formatDate(cakisanKesit.tarih)}</b> tarihinde zaten kayıtlı bir
              kesit var ({tr(cakisanKesit.kurumSayisi)} kurum). Kaydederseniz o kesit{" "}
              <b className="font-medium">silinir</b> ve yerine bu dosya yazılır — geri alınamaz.
            </p>
            <p className="mt-1 text-tx-gri">
              Geçmiş dönem yüklüyorsanız istediğiniz bu değildir: kesit tarihini o dönemin tarihine çevirin.
            </p>
            <label className="mt-2 flex items-center gap-2 font-medium">
              <input type="checkbox" checked={uzerineYazOnayi}
                     onChange={(e) => setUzerineYazOnayi(e.target.checked)}
                     className="h-3.5 w-3.5 accent-tx-kirmizi" />
              {formatDate(cakisanKesit.tarih)} kesitinin silinmesini onaylıyorum
            </label>
          </div>
        )}

        {atlandiBilgisi !== null && kayitliMi && !kayitHatasi && (
          <p className={`mt-3 rounded-md border-l-[3px] bg-white px-3 py-2 text-[13px] text-tx-gri ${
            atlandiBilgisi.baglanmamis > 0 ? "border-tx-kirmizi" : "border-tx-cizgi"}`}>
            <b className="font-medium text-tx-metin">{tr(atlandiBilgisi.toplam)}</b> kurumun tamamı
            önceki kesitlerden hatırlandığı için eşleştirme sorulmadı:{" "}
            <b className="font-medium text-tx-metin">{tr(atlandiBilgisi.bagli)}</b> kurum okula bağlı
            {atlandiBilgisi.baglanmamis > 0 && (
              <>
                , <b className="font-medium text-tx-kirmizi">{tr(atlandiBilgisi.baglanmamis)}</b> kurum
                <b className="font-medium text-tx-metin"> hiçbir okula bağlı değil</b> — bu kurumların
                verisi Okullar sayfasında görünmez. &quot;Eşleştirme&quot; düğmesinden hepsini tek
                tuşla yeni okul olarak ekleyebilirsiniz
              </>
            )}.
          </p>
        )}

        {kayitHatasi && !eslestirmede && (
          <p className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-[13px] text-tx-metin">
            {kayitHatasi}
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

      {kesit && eslestirmede ? (
        <KesitEslestirme
          oncekiKararlar={oncekiKararlar}
          kurumlar={kesit.kurumlar}
          okullar={okullar}
          kaydediliyor={kaydediliyor}
          hata={kayitHatasi}
          onGeri={() => setEslestirmede(false)}
          onKaydet={kaydet}
        />
      ) : !kesit ? null : secili ? (
        <KurumDetay
          kurum={secili}
          tarih={formatDate(kesitTarihi)}
          onGeri={() => setGorunum({ tip: "karsilastirma" })}
        />
      ) : (
        <>
          {/* iç sayfa çubuğu — Excel'in analiz sayfalarının karşılığı */}
          <div className="ic-arac flex flex-wrap items-center justify-between gap-3 border-b border-tx-cizgi">
            <div className="flex gap-1">
              {SAYFALAR.map((sf) => {
                const aktif = gorunum.tip === sf.key;
                return (
                  <button
                    key={sf.key}
                    onClick={() => setGorunum({ tip: sf.key })}
                    className={`-mb-px border-b-2 px-3.5 py-2 font-baslik text-[13.5px] font-medium transition-colors ${
                      aktif ? "border-tx-kirmizi text-tx-metin"
                            : "border-transparent text-tx-gri hover:border-tx-cizgi hover:text-tx-metin"
                    }`}
                  >
                    {sf.ad}
                  </button>
                );
              })}
            </div>
            <div className="w-72 pb-2">
              <Select value="" onChange={(e) => e.target.value && setGorunum({ tip: "kurum", kurumAdi: e.target.value })}>
                <option value="">Kurum raporuna git…</option>
                {kesit.kurumlar.length > 1 && <option value={TUMU_ADI}>{TUMU_ADI}</option>}
                {kesit.kurumlar.map((k) => <option key={k.kurumAdi} value={k.kurumAdi}>{k.kurumAdi}</option>)}
              </Select>
            </div>
          </div>

          {gorunum.tip === "karsilastirma" && (
            <>
              <div className="ic-arac">
                <h2 className="font-baslik text-lg font-semibold text-tx-metin">Kurum Karşılaştırma</h2>
                <p className="text-[12.5px] text-tx-gri">
                  Başlığa tıklayarak sıralayın · kurum adına tıklayarak o kurumun raporuna gidin
                </p>
              </div>
              {kesit.kurumlar.length > 2 && (
                <KesitDagilim
                  kurumlar={kesit.kurumlar}
                  onKurumSec={(kurumAdi) => setGorunum({ tip: "kurum", kurumAdi })}
                />
              )}
              <KesitKarsilastirma
                kurumlar={kesit.kurumlar}
                onKurumSec={(kurumAdi) => setGorunum({ tip: "kurum", kurumAdi })}
              />
            </>
          )}
          {gorunum.tip === "sube" && <KesitSubeAnalizi kurumlar={kesit.kurumlar} />}
          {gorunum.tip === "egitim" && <KesitEgitimAnalizi kurumlar={kesit.kurumlar} />}
          {gorunum.tip === "kesitler" && <KesitListesi trend={trend} />}
          {gorunum.tip === "aylik" && (
            <KesitAylikTakip trend={trend ?? { kesitler: [], kurumlar: [], toplam: [], toplamSabit: [], sabitKurumSayisi: 0 }} />
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ kurum detay --- */

export function KurumDetay({ kurum: k, tarih, onGeri }: { kurum: KesitKurum; tarih: string; onGeri: () => void }) {
  const yuzde = (n: number) => (k.ogretmenSayisi ? Math.round((n / k.ogretmenSayisi) * 100) : 0);
  /*
   * TÜMÜ raporunda `subeler` alanı şubeleri değil KURUMLARI taşır
   * (bkz. kurumlariBirlestir). 92 kurumun bütün şubelerini tek listede
   * göstermek okunmaz; asıl aranan kırılım kurum kırılımı.
   */
  const toplamMi = k.kurumAdi === TUMU_ADI;
  const kirilimAdi = toplamMi ? "Kurum" : "Şube";

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
          altBaslik={toplamMi ? "TeacherX Eğitim Tamamlama Raporu — genel toplam" : "TeacherX Eğitim Tamamlama Raporu"}
          meta={
            <>
              {toplamMi && (
                <>
                  <b className="font-medium text-tx-metin">{tr(k.subeler.length)}</b> kurum ·{" "}
                </>
              )}
              <b className="font-medium text-tx-metin">{tr(k.ogretmenSayisi)}</b> öğretmen ·{" "}
              <b className="font-medium text-tx-metin">{tr(k.subeSayisi)}</b> şube ·{" "}
              <b className="font-medium text-tx-metin">{k.egitimSayisi === null ? "—" : tr(k.egitimSayisi)}</b>{" "}
              {toplamMi ? "farklı eğitim" : "atanan eğitim"}
            </>
          }
        />

        <main className="mx-auto max-w-[900px] px-7 pb-16 pt-10">
          <Pano>
            <Kpi etiket="Öğretmen sayısı" deger={tr(k.ogretmenSayisi)} />
            <Kpi etiket={toplamMi ? "Farklı eğitim sayısı" : "Atanan eğitim sayısı"} deger={k.egitimSayisi === null ? "—" : tr(k.egitimSayisi)} alt={`${tr(k.kayitSayisi)} kayıt`} />
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

          <Bolum
            baslik={toplamMi ? "Kurumlar" : "Şubeler"}
            aciklama={toplamMi
              ? "Kurum ortalamaları. Genel ortalama kurum ortalamalarının ortalaması değildir; öğretmen sayısıyla ağırlıklıdır."
              : "Şube ortalamaları. Kurum ortalaması şube ortalamalarının ortalaması değildir; öğretmen düzeyinden hesaplanır."}
          >
            <YatayBarlar satirlar={k.subeler.map((s) => ({
              ad: s.subeAdi, oran: s.ilerlemeOrtalamasi, deger: `%${Math.round(s.ilerlemeOrtalamasi)}`,
            }))} />
            <Tablo basliklar={[kirilimAdi, "Öğretmen", "İlerleme Ort.", "Tamamlanma", "Hiç Başlamayan", "Tümünü Bitiren"]}>
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
