// Kesit hesaplama — Excel ham satırlarından SAKLANACAK ÇIKTIYI üretir.
//
// Temel kural: kişisel veri bu modülün çıktısına GİREMEZ. Girdi tipinde
// e-posta yalnızca kimlik olarak kullanılır (öğretmen tekilleştirmek için);
// ad-soyad hiç alınmaz. Çıktı tiplerinde kişiye ait tek bir alan yoktur —
// bu, gizliliğin yorum değil tip düzeyinde garanti edilmesi demek.
//
// Tanımlar KULLANIM.md (kurum_raporu.py) ile birebir aynıdır.

/**
 * Detaylı döküm satırı — her satır bir öğretmen × eğitim.
 * Sütunlar: Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi
 * Ad-soyad bilerek alınmaz.
 */
export interface HamSatir {
  eposta: string;
  kurum: string;
  sube: string;
  egitim: string;
  /** 0..1 aralığında ilerleme */
  ilerleme: number;
  /** ISO "YYYY-MM-DD" ya da null */
  sertifikaTarihi: string | null;
}

/**
 * Özet döküm satırı — her satır bir öğretmen.
 * Sütunlar: Adı Soyadı · E-posta · Kurum · Şube · Tamamlanan · Devam Eden · Tamamlama %
 * Eğitim adı ve sertifika tarihi yok; bu yüzden eğitim kırılımı ve
 * sertifika metrikleri üretilemez (ilgili alanlar null kalır).
 */
export interface OzetSatir {
  eposta: string;
  kurum: string;
  sube: string;
  tamamlanan: number;
  devamEden: number;
  /** 0..1 aralığında, platformun verdiği tamamlama yüzdesi */
  yuzde: number;
}

/** Kesitin hangi dökümden üretildiği. */
export type KesitKaynagi = "detayli" | "ozet";

export interface KesitSube {
  subeAdi: string;
  ogretmenSayisi: number;
  /** Özet dökümde bilinmez */
  egitimSayisi: number | null;
  ilerlemeOrtalamasi: number;  // %
  tamamlanmaOrani: number;     // %
  /** Özet dökümde bilinmez */
  sertifikaSayisi: number | null;
  hicBaslamayan: number;
  devamEden: number;
  tumunuTamamlayan: number;
}

export interface KesitEgitim {
  egitimAdi: string;
  atananOgretmen: number;
  tamamlayan: number;
  tamamlanmaOrani: number;     // %
  hicBaslamayan: number;
  sertifikaSayisi: number;
}

export interface KesitKurum {
  kaynak: KesitKaynagi;
  kurumAdi: string;
  ogretmenSayisi: number;
  subeSayisi: number;
  /** Kaç FARKLI eğitim atandığı — özet dökümde bilinmez */
  egitimSayisi: number | null;
  /** Toplam öğretmen × eğitim kaydı */
  kayitSayisi: number;
  /** Öğretmen düzeyinde ilerleme ortalaması — kısmi ilerleme SAYILIR */
  ilerlemeOrtalamasi: number;
  /** Öğretmen düzeyinde tamamlanan ÷ atanan — kısmi SAYILMAZ */
  tamamlanmaOrani: number;
  tamamlananEgitim: number;
  /** Özet dökümde bilinmez */
  sertifikaSayisi: number | null;
  /** Özet dökümde bilinmez */
  sertifikaAlan: number | null;
  hicBaslamayan: number;
  devamEden: number;
  tumunuTamamlayan: number;
  /** Atanan eğitim sayısı kurumun tipik değerinden farklı olan öğretmen adedi */
  esitsizAtama: number;
  subeler: KesitSube[];
  /** Özet dökümde boş kalır */
  egitimler: KesitEgitim[];
  sertifikaAylik: { ay: string; adet: number }[];
}

export interface KesitUyari {
  epostasizSatir: number;
  birlestirilenMukerrer: number;
  olcekDuzeltildi: boolean;
}

export interface Kesit {
  kurumlar: KesitKurum[];
  uyarilar: KesitUyari;
}

const yuzde = (n: number) => Math.round(n * 10000) / 100; // 0..1 → 0..100, 2 hane

/** Sayı dizisinde en sık geçen değer (beraberlikte en büyüğü). */
function mod(xs: number[]): number {
  const say = new Map<number, number>();
  for (const x of xs) say.set(x, (say.get(x) ?? 0) + 1);
  let enIyi = 0, enCok = -1;
  for (const [deger, adet] of say) {
    if (adet > enCok || (adet === enCok && deger > enIyi)) { enIyi = deger; enCok = adet; }
  }
  return enIyi;
}

/**
 * Ham satırlardan kesit üretir.
 *
 * - Kimlik e-postadır. E-postası olmayan satır sayılır ve atılır (KULLANIM.md:
 *   "ad-soyad hiçbir yerde kimlik olarak kullanılmaz").
 * - Aynı öğretmen + aynı eğitim birden çok satırdaysa en yüksek ilerleme tutulur.
 * - Ortalamalar önce kişi düzeyinde, sonra kişiler arasında alınır.
 */
export function kesitUret(satirlar: HamSatir[], olcekDuzeltildi = false): Kesit {
  let epostasizSatir = 0;
  let birlestirilenMukerrer = 0;

  // kurum → eposta → egitim → satır
  const kurumlar = new Map<string, Map<string, Map<string, HamSatir>>>();

  for (const s of satirlar) {
    const eposta = s.eposta.trim().toLowerCase();
    if (!eposta) { epostasizSatir++; continue; }

    const kurum = s.kurum.trim() || "—";
    if (!kurumlar.has(kurum)) kurumlar.set(kurum, new Map());
    const kisiler = kurumlar.get(kurum)!;
    if (!kisiler.has(eposta)) kisiler.set(eposta, new Map());
    const egitimler = kisiler.get(eposta)!;

    const egitim = s.egitim.trim() || "—";
    const onceki = egitimler.get(egitim);
    if (!onceki) { egitimler.set(egitim, { ...s, eposta }); continue; }

    birlestirilenMukerrer++;
    // Mükerrer kayıtta en yüksek ilerleme tutulur (kurum_raporu.py ile aynı varsayım)
    if (s.ilerleme > onceki.ilerleme) onceki.ilerleme = s.ilerleme;
    if (!onceki.sertifikaTarihi && s.sertifikaTarihi) onceki.sertifikaTarihi = s.sertifikaTarihi;
    if (!onceki.sube && s.sube) onceki.sube = s.sube;
  }

  const cikti: KesitKurum[] = [];

  for (const [kurumAdi, kisiler] of kurumlar) {
    const tumEgitimler = new Set<string>();
    const tumSubeler = new Set<string>();

    let kayitSayisi = 0, tamamlananEgitim = 0, sertifikaSayisi = 0, sertifikaAlan = 0;
    let hicBaslamayan = 0, devamEden = 0, tumunuTamamlayan = 0;
    let ilerlemeToplam = 0, oranToplam = 0;
    const atananSayilari: number[] = [];

    // şube ve eğitim toplayıcıları
    type SubeAcc = { kisi: number; ilerleme: number; oran: number; sert: number;
                     hic: number; devam: number; tum: number; egitimler: Set<string> };
    const subeAcc = new Map<string, SubeAcc>();
    type EgitimAcc = { atanan: number; tamamlayan: number; hic: number; sert: number };
    const egitimAcc = new Map<string, EgitimAcc>();
    const sertAy = new Map<string, number>();

    for (const [, egitimMap] of kisiler) {
      const satirlar = [...egitimMap.values()];
      const atanan = satirlar.length;
      const tamamlanan = satirlar.filter((r) => r.ilerleme >= 1).length;
      const kisiIlerleme = satirlar.reduce((a, r) => a + r.ilerleme, 0) / atanan;
      const kisiOran = tamamlanan / atanan;
      const kisiSert = satirlar.filter((r) => r.sertifikaTarihi).length;

      kayitSayisi += atanan;
      tamamlananEgitim += tamamlanan;
      sertifikaSayisi += kisiSert;
      if (kisiSert > 0) sertifikaAlan++;
      ilerlemeToplam += kisiIlerleme;
      oranToplam += kisiOran;
      atananSayilari.push(atanan);

      const hicBaslamadi = satirlar.every((r) => r.ilerleme <= 0);
      const hepsiBitti = tamamlanan === atanan && atanan > 0;
      if (hicBaslamadi) hicBaslamayan++;
      else if (hepsiBitti) tumunuTamamlayan++;
      else devamEden++;

      // şube: kişinin ilk satırındaki şube
      const subeAdi = satirlar[0].sube.trim() || "Şube bilgisi eksik";
      tumSubeler.add(subeAdi);
      const sa = subeAcc.get(subeAdi) ?? { kisi: 0, ilerleme: 0, oran: 0, sert: 0,
                                           hic: 0, devam: 0, tum: 0, egitimler: new Set<string>() };
      sa.kisi++; sa.ilerleme += kisiIlerleme; sa.oran += kisiOran; sa.sert += kisiSert;
      if (hicBaslamadi) sa.hic++; else if (hepsiBitti) sa.tum++; else sa.devam++;
      for (const r of satirlar) sa.egitimler.add(r.egitim);
      subeAcc.set(subeAdi, sa);

      for (const r of satirlar) {
        tumEgitimler.add(r.egitim);
        const ea = egitimAcc.get(r.egitim) ?? { atanan: 0, tamamlayan: 0, hic: 0, sert: 0 };
        ea.atanan++;
        if (r.ilerleme >= 1) ea.tamamlayan++;
        if (r.ilerleme <= 0) ea.hic++;
        if (r.sertifikaTarihi) {
          ea.sert++;
          const ay = r.sertifikaTarihi.slice(0, 7) + "-01";
          sertAy.set(ay, (sertAy.get(ay) ?? 0) + 1);
        }
        egitimAcc.set(r.egitim, ea);
      }
    }

    const n = kisiler.size;
    const tipikAtama = mod(atananSayilari);

    cikti.push({
      kaynak: "detayli",
      kurumAdi,
      ogretmenSayisi: n,
      subeSayisi: tumSubeler.size,
      egitimSayisi: tumEgitimler.size,
      kayitSayisi,
      ilerlemeOrtalamasi: n ? yuzde(ilerlemeToplam / n) : 0,
      tamamlanmaOrani: n ? yuzde(oranToplam / n) : 0,
      tamamlananEgitim,
      sertifikaSayisi,
      sertifikaAlan,
      hicBaslamayan,
      devamEden,
      tumunuTamamlayan,
      esitsizAtama: atananSayilari.filter((a) => a !== tipikAtama).length,
      subeler: [...subeAcc.entries()]
        .map(([subeAdi, v]) => ({
          subeAdi,
          ogretmenSayisi: v.kisi,
          egitimSayisi: v.egitimler.size,
          ilerlemeOrtalamasi: yuzde(v.ilerleme / v.kisi),
          tamamlanmaOrani: yuzde(v.oran / v.kisi),
          sertifikaSayisi: v.sert,
          hicBaslamayan: v.hic,
          devamEden: v.devam,
          tumunuTamamlayan: v.tum,
        }))
        .sort((a, b) => b.ilerlemeOrtalamasi - a.ilerlemeOrtalamasi),
      egitimler: [...egitimAcc.entries()]
        .map(([egitimAdi, v]) => ({
          egitimAdi,
          atananOgretmen: v.atanan,
          tamamlayan: v.tamamlayan,
          tamamlanmaOrani: v.atanan ? yuzde(v.tamamlayan / v.atanan) : 0,
          hicBaslamayan: v.hic,
          sertifikaSayisi: v.sert,
        }))
        .sort((a, b) => a.tamamlanmaOrani - b.tamamlanmaOrani),
      sertifikaAylik: [...sertAy.entries()]
        .map(([ay, adet]) => ({ ay, adet }))
        .sort((a, b) => a.ay.localeCompare(b.ay)),
    });
  }

  return {
    kurumlar: cikti.sort((a, b) => a.kurumAdi.localeCompare(b.kurumAdi, "tr")),
    uyarilar: { epostasizSatir, birlestirilenMukerrer, olcekDuzeltildi },
  };
}

/**
 * Özet dökümden kesit üretir (satır = öğretmen).
 *
 * Detaylı dökümden farkı: eğitim adı ve sertifika tarihi olmadığı için
 * `egitimSayisi`, `sertifikaSayisi`, `sertifikaAlan` null kalır; `egitimler`
 * ve `sertifikaAylik` boş döner. Ekran bu alanları "—" gösterir, uydurmaz.
 *
 * Ortalamalar yine öğretmen düzeyinden alınır:
 * - ilerlemeOrtalamasi: platformun verdiği Tamamlama %'lerinin ortalaması
 * - tamamlanmaOrani: her öğretmenin tamamladığı ÷ atananının ortalaması
 */
export function kesitUretOzet(satirlar: OzetSatir[]): Kesit {
  let epostasizSatir = 0;
  let birlestirilenMukerrer = 0;

  const kurumlar = new Map<string, Map<string, OzetSatir>>();
  for (const s of satirlar) {
    const eposta = s.eposta.trim().toLowerCase();
    if (!eposta) { epostasizSatir++; continue; }
    const kurum = s.kurum.trim() || "—";
    if (!kurumlar.has(kurum)) kurumlar.set(kurum, new Map());
    const kisiler = kurumlar.get(kurum)!;
    const onceki = kisiler.get(eposta);
    if (!onceki) { kisiler.set(eposta, { ...s, eposta }); continue; }

    // Aynı öğretmen iki kez: adetler toplanır, yüzde kayıt sayısına göre ağırlıklanır
    birlestirilenMukerrer++;
    const wOnce = onceki.tamamlanan + onceki.devamEden;
    const wYeni = s.tamamlanan + s.devamEden;
    const wTop = wOnce + wYeni;
    onceki.tamamlanan += s.tamamlanan;
    onceki.devamEden += s.devamEden;
    onceki.yuzde = wTop > 0
      ? (onceki.yuzde * wOnce + s.yuzde * wYeni) / wTop
      : (onceki.yuzde + s.yuzde) / 2;
    if (!onceki.sube && s.sube) onceki.sube = s.sube;
  }

  const cikti: KesitKurum[] = [];

  for (const [kurumAdi, kisiler] of kurumlar) {
    const tumSubeler = new Set<string>();
    let kayitSayisi = 0, tamamlananEgitim = 0;
    let hicBaslamayan = 0, devamEdenSayisi = 0, tumunuTamamlayan = 0;
    let ilerlemeToplam = 0, oranToplam = 0;
    const atananSayilari: number[] = [];

    type SubeAcc = { kisi: number; ilerleme: number; oran: number;
                     hic: number; devam: number; tum: number };
    const subeAcc = new Map<string, SubeAcc>();

    for (const [, k] of kisiler) {
      const atanan = k.tamamlanan + k.devamEden;
      const kisiOran = atanan > 0 ? k.tamamlanan / atanan : 0;

      kayitSayisi += atanan;
      tamamlananEgitim += k.tamamlanan;
      ilerlemeToplam += k.yuzde;
      oranToplam += kisiOran;
      atananSayilari.push(atanan);

      const hicBaslamadi = k.tamamlanan === 0 && k.yuzde <= 0;
      const hepsiBitti = k.yuzde >= 1 || (atanan > 0 && k.devamEden === 0 && k.tamamlanan > 0);
      if (hicBaslamadi) hicBaslamayan++;
      else if (hepsiBitti) tumunuTamamlayan++;
      else devamEdenSayisi++;

      const subeAdi = k.sube.trim() || "Şube bilgisi eksik";
      tumSubeler.add(subeAdi);
      const sa = subeAcc.get(subeAdi) ?? { kisi: 0, ilerleme: 0, oran: 0, hic: 0, devam: 0, tum: 0 };
      sa.kisi++; sa.ilerleme += k.yuzde; sa.oran += kisiOran;
      if (hicBaslamadi) sa.hic++; else if (hepsiBitti) sa.tum++; else sa.devam++;
      subeAcc.set(subeAdi, sa);
    }

    const n = kisiler.size;
    const tipikAtama = mod(atananSayilari);

    cikti.push({
      kaynak: "ozet",
      kurumAdi,
      ogretmenSayisi: n,
      subeSayisi: tumSubeler.size,
      egitimSayisi: null,          // eğitim adı yok
      kayitSayisi,
      ilerlemeOrtalamasi: n ? yuzde(ilerlemeToplam / n) : 0,
      tamamlanmaOrani: n ? yuzde(oranToplam / n) : 0,
      tamamlananEgitim,
      sertifikaSayisi: null,       // sertifika tarihi yok
      sertifikaAlan: null,
      hicBaslamayan,
      devamEden: devamEdenSayisi,
      tumunuTamamlayan,
      esitsizAtama: atananSayilari.filter((a) => a !== tipikAtama).length,
      subeler: [...subeAcc.entries()]
        .map(([subeAdi, v]) => ({
          subeAdi,
          ogretmenSayisi: v.kisi,
          egitimSayisi: null,
          ilerlemeOrtalamasi: yuzde(v.ilerleme / v.kisi),
          tamamlanmaOrani: yuzde(v.oran / v.kisi),
          sertifikaSayisi: null,
          hicBaslamayan: v.hic,
          devamEden: v.devam,
          tumunuTamamlayan: v.tum,
        }))
        .sort((a, b) => b.ilerlemeOrtalamasi - a.ilerlemeOrtalamasi),
      egitimler: [],
      sertifikaAylik: [],
    });
  }

  return {
    kurumlar: cikti.sort((a, b) => a.kurumAdi.localeCompare(b.kurumAdi, "tr")),
    uyarilar: { epostasizSatir, birlestirilenMukerrer, olcekDuzeltildi: false },
  };
}

/* ------------------------------------------------------- TÜMÜ toplaması --- */

/** "TÜMÜ" satırının adı — kurum adlarıyla çakışmaması için tek noktada. */
export const TUMU_ADI = "TÜMÜ — bütün kurumlar";

/**
 * Kurumları tek bir toplam "kurum"a indirger (PLAN §Adım 8).
 *
 * Kurallar:
 * - Ortalamalar kurum ortalamalarının ortalaması DEĞİL, öğretmen sayısıyla
 *   ağırlıklıdır. 12 öğretmenli bir kurum 940 öğretmenliyle aynı ağırlıkta
 *   olamaz.
 * - Eğitim sayısı TOPLANMAZ: aynı eğitim birçok kuruma atanıyor, toplamak
 *   katlardı. Eğitim adlarının BİRLEŞİMİ alınır.
 * - Bilinmeyen (null) bir değer varsa toplam da bilinmez. Kısmi toplam
 *   "sertifika düştü" gibi okunurdu.
 * - Şube kırılımı yerine KURUM kırılımı konur: 92 kurumun bütün şubelerini
 *   tek listede göstermek okunmaz, kurum kırılımı ise tam da aranan şey.
 */
export function kurumlariBirlestir(kurumlar: KesitKurum[]): KesitKurum | null {
  if (kurumlar.length === 0) return null;

  const toplamOgretmen = kurumlar.reduce((a, k) => a + k.ogretmenSayisi, 0);
  const agirlikli = (sec: (k: KesitKurum) => number) =>
    toplamOgretmen === 0 ? 0
      : kurumlar.reduce((a, k) => a + sec(k) * k.ogretmenSayisi, 0) / toplamOgretmen;

  const sertifikaBilinmiyor = kurumlar.some((k) => k.sertifikaSayisi === null);
  const sertifikaAlanBilinmiyor = kurumlar.some((k) => k.sertifikaAlan === null);

  // Eğitimler ada göre birleşir; oran ham sayılardan YENİDEN hesaplanır,
  // oranların ortalaması alınmaz.
  const egitimHaritasi = new Map<string, KesitEgitim>();
  for (const k of kurumlar) {
    for (const e of k.egitimler) {
      const v = egitimHaritasi.get(e.egitimAdi);
      if (v) {
        v.atananOgretmen += e.atananOgretmen;
        v.tamamlayan += e.tamamlayan;
        v.hicBaslamayan += e.hicBaslamayan;
        v.sertifikaSayisi += e.sertifikaSayisi;
      } else {
        egitimHaritasi.set(e.egitimAdi, { ...e });
      }
    }
  }
  const egitimler = [...egitimHaritasi.values()]
    .map((e) => ({
      ...e,
      tamamlanmaOrani: e.atananOgretmen === 0 ? 0 : (e.tamamlayan / e.atananOgretmen) * 100,
    }))
    .sort((a, b) => a.tamamlanmaOrani - b.tamamlanmaOrani);

  const aylar = new Map<string, number>();
  for (const k of kurumlar) {
    for (const a of k.sertifikaAylik) aylar.set(a.ay, (aylar.get(a.ay) ?? 0) + a.adet);
  }

  return {
    kaynak: kurumlar[0].kaynak,
    kurumAdi: TUMU_ADI,
    ogretmenSayisi: toplamOgretmen,
    subeSayisi: kurumlar.reduce((a, k) => a + k.subeSayisi, 0),
    egitimSayisi: kurumlar.some((k) => k.egitimSayisi === null) ? null : egitimHaritasi.size,
    kayitSayisi: kurumlar.reduce((a, k) => a + k.kayitSayisi, 0),
    ilerlemeOrtalamasi: agirlikli((k) => k.ilerlemeOrtalamasi),
    tamamlanmaOrani: agirlikli((k) => k.tamamlanmaOrani),
    tamamlananEgitim: kurumlar.reduce((a, k) => a + k.tamamlananEgitim, 0),
    sertifikaSayisi: sertifikaBilinmiyor ? null : kurumlar.reduce((a, k) => a + (k.sertifikaSayisi ?? 0), 0),
    sertifikaAlan: sertifikaAlanBilinmiyor ? null : kurumlar.reduce((a, k) => a + (k.sertifikaAlan ?? 0), 0),
    hicBaslamayan: kurumlar.reduce((a, k) => a + k.hicBaslamayan, 0),
    devamEden: kurumlar.reduce((a, k) => a + k.devamEden, 0),
    tumunuTamamlayan: kurumlar.reduce((a, k) => a + k.tumunuTamamlayan, 0),
    esitsizAtama: kurumlar.reduce((a, k) => a + k.esitsizAtama, 0),
    // Şube yerine KURUM kırılımı — "şube" alanı burada kurumu taşır.
    subeler: kurumlar
      .map((k) => ({
        subeAdi: k.kurumAdi,
        ogretmenSayisi: k.ogretmenSayisi,
        egitimSayisi: k.egitimSayisi,
        ilerlemeOrtalamasi: k.ilerlemeOrtalamasi,
        tamamlanmaOrani: k.tamamlanmaOrani,
        sertifikaSayisi: k.sertifikaSayisi,
        hicBaslamayan: k.hicBaslamayan,
        devamEden: k.devamEden,
        tumunuTamamlayan: k.tumunuTamamlayan,
      }))
      .sort((a, b) => b.ilerlemeOrtalamasi - a.ilerlemeOrtalamasi),
    egitimler,
    sertifikaAylik: [...aylar.entries()]
      .map(([ay, adet]) => ({ ay, adet }))
      .sort((a, b) => a.ay.localeCompare(b.ay)),
  };
}
