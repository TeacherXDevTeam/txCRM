// Kesit hesaplama — Excel ham satırlarından SAKLANACAK ÇIKTIYI üretir.
//
// Temel kural: kişisel veri bu modülün çıktısına GİREMEZ. Girdi tipinde
// e-posta yalnızca kimlik olarak kullanılır (öğretmen tekilleştirmek için);
// ad-soyad hiç alınmaz. Çıktı tiplerinde kişiye ait tek bir alan yoktur —
// bu, gizliliğin yorum değil tip düzeyinde garanti edilmesi demek.
//
// Tanımlar KULLANIM.md (kurum_raporu.py) ile birebir aynıdır.

/** Excel'den okunan tek satır. Ad-soyad bilerek yok. */
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

export interface KesitSube {
  subeAdi: string;
  ogretmenSayisi: number;
  egitimSayisi: number;
  ilerlemeOrtalamasi: number;  // %
  tamamlanmaOrani: number;     // %
  sertifikaSayisi: number;
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
  kurumAdi: string;
  ogretmenSayisi: number;
  subeSayisi: number;
  egitimSayisi: number;
  kayitSayisi: number;
  /** Öğretmen düzeyinde ilerleme ortalaması — kısmi ilerleme SAYILIR */
  ilerlemeOrtalamasi: number;
  /** Öğretmen düzeyinde tamamlanan ÷ atanan — kısmi SAYILMAZ */
  tamamlanmaOrani: number;
  tamamlananEgitim: number;
  sertifikaSayisi: number;
  sertifikaAlan: number;
  hicBaslamayan: number;
  devamEden: number;
  tumunuTamamlayan: number;
  /** Atanan eğitim sayısı kurumun tipik değerinden farklı olan öğretmen adedi */
  esitsizAtama: number;
  subeler: KesitSube[];
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
