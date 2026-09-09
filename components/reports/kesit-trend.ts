// Aylık Takip — kesitler arasındaki zaman serisi.
//
// Bu dosyada "use client" YOK ve olmamalı: `raporlar/page.tsx` bir Server
// Component ve `trendKur`'u sunucuda çağırıyor. İstemci modülünden içe
// aktarılan bir fonksiyon sunucuda gerçek fonksiyon değil bir istemci
// referansı olur ve çağrı patlar (bu üretimde yaşandı — bkz. kesit-map.ts).
//
// Excel'de bu sayfa her ay elle kopyala-yapıştır gerektiriyordu; burada
// bedava, çünkü her kesit zaten tarihli.

import type { Database } from "@/types/database";

type KurumRow = Database["public"]["Tables"]["report_kurum"]["Row"];

/** Bir kesitte bir kurumun ölçülen değerleri. */
export interface TrendHucre {
  ogretmenSayisi: number;
  subeSayisi: number;
  egitimSayisi: number | null;
  ilerlemeOrtalamasi: number;
  tamamlanmaOrani: number;
  /** null = özet dökümden gelindi, bilinmiyor ("0 sertifika" ile aynı şey değil) */
  sertifikaSayisi: number | null;
  hicBaslamayan: number;
  tumunuTamamlayan: number;
}

export interface TrendKurum {
  /** school_id varsa o, yoksa kurum adı — ad değişse bile seri kopmasın diye */
  anahtar: string;
  /** En son kesitteki ad */
  kurumAdi: string;
  schoolId: string | null;
  /** `kesitler` dizisiyle aynı uzunlukta; null = o kesitte bu kurum yok */
  hucreler: (TrendHucre | null)[];
  /** Kurum her kesitte ölçülmüş mü (sabit sepet hesabı için) */
  tamSeri: boolean;
}

export interface TrendKesit {
  id: string;
  /** ISO "YYYY-MM-DD" */
  tarih: string;
  /** O kesitte ölçülen kurum sayısı */
  kurumSayisi: number;
}

export interface Trend {
  /** Eskiden yeniye */
  kesitler: TrendKesit[];
  kurumlar: TrendKurum[];
  /** Her kesitte ölçülen TÜM kurumların ağırlıklı toplamı (sepet değişebilir) */
  toplam: (TrendHucre | null)[];
  /** Yalnızca her kesitte bulunan kurumların ağırlıklı toplamı (sepet sabit) */
  toplamSabit: (TrendHucre | null)[];
  /** Sabit sepetteki kurum sayısı */
  sabitKurumSayisi: number;
}

/** Öğretmen sayısıyla ağırlıklı ortalama; ağırlık toplamı 0 ise null. */
function agirlikliOrtalama(degerler: number[], agirliklar: number[]): number {
  const toplamAgirlik = agirliklar.reduce((a, b) => a + b, 0);
  if (toplamAgirlik === 0) return 0;
  let t = 0;
  for (let i = 0; i < degerler.length; i++) t += degerler[i] * agirliklar[i];
  return t / toplamAgirlik;
}

/**
 * Bir kesitteki hücreleri tek bir toplam hücreye indirger.
 *
 * Ortalamalar kurum ortalamalarının ortalaması DEĞİL, öğretmen sayısıyla
 * ağırlıklıdır — 12 öğretmenli bir kurum 900 öğretmenli bir kurumla aynı
 * ağırlığa sahip olamaz.
 *
 * Sertifika: kurumlardan biri bile bilinmiyorsa (özet döküm) toplam da
 * bilinmiyor sayılır — kısmi toplam "sertifika düştü" gibi okunurdu.
 */
function hucreleriTopla(hucreler: TrendHucre[]): TrendHucre | null {
  if (hucreler.length === 0) return null;
  const agirlik = hucreler.map((h) => h.ogretmenSayisi);
  const sertifikaBilinmiyor = hucreler.some((h) => h.sertifikaSayisi === null);
  const egitimBilinmiyor = hucreler.some((h) => h.egitimSayisi === null);
  return {
    ogretmenSayisi: hucreler.reduce((a, h) => a + h.ogretmenSayisi, 0),
    subeSayisi: hucreler.reduce((a, h) => a + h.subeSayisi, 0),
    egitimSayisi: egitimBilinmiyor ? null : hucreler.reduce((a, h) => a + (h.egitimSayisi ?? 0), 0),
    ilerlemeOrtalamasi: agirlikliOrtalama(hucreler.map((h) => h.ilerlemeOrtalamasi), agirlik),
    tamamlanmaOrani: agirlikliOrtalama(hucreler.map((h) => h.tamamlanmaOrani), agirlik),
    sertifikaSayisi: sertifikaBilinmiyor ? null : hucreler.reduce((a, h) => a + (h.sertifikaSayisi ?? 0), 0),
    hicBaslamayan: hucreler.reduce((a, h) => a + h.hicBaslamayan, 0),
    tumunuTamamlayan: hucreler.reduce((a, h) => a + h.tumunuTamamlayan, 0),
  };
}

function satiriHucreyeCevir(r: KurumRow): TrendHucre {
  return {
    ogretmenSayisi: r.ogretmen_sayisi,
    subeSayisi: r.sube_sayisi,
    egitimSayisi: r.egitim_sayisi,
    ilerlemeOrtalamasi: Number(r.ilerleme_ortalamasi),
    tamamlanmaOrani: Number(r.tamamlanma_orani),
    sertifikaSayisi: r.sertifika_sayisi,
    hicBaslamayan: r.hic_baslamayan,
    tumunuTamamlayan: r.tumunu_tamamlayan,
  };
}

/**
 * Kesit ve kurum satırlarından zaman serisini kurar.
 *
 * @param kesitSatirlari  report_kesit — sıra önemli değil, burada sıralanır
 * @param kurumSatirlari  report_kurum — tüm kesitlerin satırları bir arada
 */
export function trendKur(
  kesitSatirlari: { id: string; kesit_tarihi: string }[],
  kurumSatirlari: KurumRow[],
): Trend {
  const kesitler = [...kesitSatirlari]
    .sort((a, b) => a.kesit_tarihi.localeCompare(b.kesit_tarihi))
    .map((k) => ({ id: k.id, tarih: k.kesit_tarihi, kurumSayisi: 0 }));

  const sira = new Map(kesitler.map((k, i) => [k.id, i]));

  // anahtar → kurum. Aynı kurumun adı kesitler arasında değişse bile
  // school_id aynıysa tek seri olur.
  const kurumlar = new Map<string, TrendKurum>();
  // anahtar → adın alındığı kesit sırası. Satırlar tarih sırasında gelmediği
  // için "son satır kazansın" demek yanlış ad gösterir.
  const adSirasi = new Map<string, number>();

  for (const r of kurumSatirlari) {
    const i = sira.get(r.kesit_id);
    if (i === undefined) continue;             // kesiti çekilmemiş satır
    const anahtar = r.school_id ?? `ad:${r.kurum_adi}`;

    let kurum = kurumlar.get(anahtar);
    if (!kurum) {
      kurum = {
        anahtar,
        kurumAdi: r.kurum_adi,
        schoolId: r.school_id,
        hucreler: new Array(kesitler.length).fill(null),
        tamSeri: false,
      };
      kurumlar.set(anahtar, kurum);
    }
    kurum.hucreler[i] = satiriHucreyeCevir(r);
    // En son KESİTTEKİ adı tut — kurum adı zamanla düzeltilmiş olabilir.
    // Ölçüt satır sırası değil kesit sırası; `kurumSatirlari` tarihe göre
    // sıralı gelmiyor (sorgu kesit_id'ye göre sıralıyor, o da UUID).
    const oncekiSira = adSirasi.get(anahtar);
    if (oncekiSira === undefined || i > oncekiSira) {
      kurum.kurumAdi = r.kurum_adi;
      adSirasi.set(anahtar, i);
    }
    kesitler[i].kurumSayisi++;
  }

  const liste = [...kurumlar.values()];
  for (const k of liste) k.tamSeri = k.hucreler.every((h) => h !== null);
  liste.sort((a, b) => a.kurumAdi.localeCompare(b.kurumAdi, "tr"));

  const sabitler = liste.filter((k) => k.tamSeri);

  return {
    kesitler,
    kurumlar: liste,
    toplam: kesitler.map((_, i) =>
      hucreleriTopla(liste.map((k) => k.hucreler[i]).filter((h): h is TrendHucre => h !== null))),
    toplamSabit: kesitler.map((_, i) =>
      hucreleriTopla(sabitler.map((k) => k.hucreler[i]).filter((h): h is TrendHucre => h !== null))),
    sabitKurumSayisi: sabitler.length,
  };
}

/* ------------------------------------------------------------- metrikler --- */

export type MetrikAnahtar =
  | "ilerlemeOrtalamasi" | "tamamlanmaOrani" | "sertifikaSayisi"
  | "hicBaslamayan" | "tumunuTamamlayan" | "ogretmenSayisi";

export interface MetrikTanimi {
  anahtar: MetrikAnahtar;
  ad: string;
  /** Yüzde metriği mi (0–100) — eksen ve biçimlendirme buna göre */
  yuzde: boolean;
  /** Artması kötü mü — renk yönü */
  artmasiKotu: boolean;
  aciklama: string;
}

export const METRIKLER: MetrikTanimi[] = [
  { anahtar: "ilerlemeOrtalamasi", ad: "İlerleme Ortalaması", yuzde: true,  artmasiKotu: false,
    aciklama: "Öğretmen düzeyinde ortalama; kısmi ilerleme sayılır" },
  { anahtar: "tamamlanmaOrani",    ad: "Tamamlanma Oranı",    yuzde: true,  artmasiKotu: false,
    aciklama: "Tamamlanan ÷ atanan; kısmi ilerleme sayılmaz" },
  { anahtar: "sertifikaSayisi",    ad: "Sertifika",           yuzde: false, artmasiKotu: false,
    aciklama: "Verilen sertifika adedi — özet dökümde bilinmez" },
  { anahtar: "hicBaslamayan",      ad: "Hiç Başlamayan",      yuzde: false, artmasiKotu: true,
    aciklama: "Hiçbir eğitime başlamamış öğretmen sayısı" },
  { anahtar: "tumunuTamamlayan",   ad: "Tümünü Tamamlayan",   yuzde: false, artmasiKotu: false,
    aciklama: "Atanan eğitimlerin tamamını bitiren öğretmen sayısı" },
  { anahtar: "ogretmenSayisi",     ad: "Öğretmen Sayısı",     yuzde: false, artmasiKotu: false,
    aciklama: "Kesitte ölçülen öğretmen sayısı" },
];

/** Hücreden metrik değerini çeker; bilinmiyorsa null. */
export function metrikDegeri(hucre: TrendHucre | null, metrik: MetrikAnahtar): number | null {
  if (!hucre) return null;
  return hucre[metrik];
}

/** "2026-09-09" → "09.26" — Date kullanmaz, saat dilimine bağlı değildir. */
export function kisaAy(tarih: string): string {
  return `${tarih.slice(5, 7)}.${tarih.slice(2, 4)}`;
}

/**
 * "YYYY-MM-DD" → 1970'ten beri geçen gün sayısı.
 *
 * `Date.UTC` kullanılır, `new Date(str)` değil: yerel saat dilimi işin içine
 * girmez, sunucu (UTC) ve tarayıcı (UTC+3) aynı sayıyı üretir. Daha önce
 * saat dilimi farkı canlıda hydration çökertmişti.
 */
export function gunNumarasi(tarih: string): number {
  const [y, a, g] = tarih.split("-").map(Number);
  return Math.round(Date.UTC(y, a - 1, g) / 86_400_000);
}

/**
 * Kesitleri zaman eksenine 0..1 aralığında yerleştirir.
 *
 * Eşit aralıklı çizmek yanlış olurdu: geçen yılın kapanış dosyası ile bu ayın
 * kesiti arasında 15 ay, iki aylık kesit arasında 1 ay var; ikisini aynı
 * genişlikte göstermek eğimi yanıltıcı yapar.
 *
 * Tek kesitte ya da tüm kesitler aynı gündeyse hepsi 0.5'e (ortaya) düşer.
 */
export function zamanKonumlari(tarihler: string[]): number[] {
  if (tarihler.length === 0) return [];
  const gunler = tarihler.map(gunNumarasi);
  const ilk = Math.min(...gunler), son = Math.max(...gunler);
  const aralik = son - ilk;
  if (aralik === 0) return gunler.map(() => 0.5);
  return gunler.map((g) => (g - ilk) / aralik);
}
