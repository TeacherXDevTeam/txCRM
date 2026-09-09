// Rapordaki serbest metin kurum adını CRM'deki okul kaydıyla eşleştirir.
//
// Neden gerekli: rapor platformdan geliyor, CRM'e ise okullar elle girilmiş.
// Adlar sistematik olarak farklı yazılıyor:
//   "ALKEV Özel Okulları"  ↔ "ALKEV"
//   "Özel Arı Okulları"    ↔ "Arı Okulları"
//   "İTÜ GVO İzmir"        ↔ "İzmir İTÜ GVO"     (kelime sırası değişik)
// Birebir karşılaştırma bunların hiçbirini yakalamaz.

/** Kurum adında ayırt edici olmayan, her okulda geçen kelimeler. */
const GENEL_KELIMELER = new Set([
  "ozel", "okullari", "okulu", "okul", "koleji", "kolej", "kolejleri",
  "egitim", "egitimleri", "kurumlari", "kurumu", "kurum", "anadolu",
  "lisesi", "lise", "ortaokulu", "ortaokul", "ilkokulu", "ilkokul",
  "anaokulu", "anaokul", "kampusu", "kampus", "sube", "subesi",
  "ve", "ile", "as", "ltd", "sti",
]);

/** Türkçe karakterleri sadeleştirir. */
function katla(s: string): string {
  return s
    .replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o").replace(/[Üü]/g, "u").replace(/[Ğğ]/g, "g")
    .toLowerCase();
}

/** Adı ayırt edici kelime kümesine indirger. */
export function anahtarKelimeler(ad: string): Set<string> {
  const kelimeler = katla(ad)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((k) => k.length > 0 && !GENEL_KELIMELER.has(k));
  // Hepsi genel kelimeyse ada sadık kal — boş kümeyle her şey eşleşirdi
  return new Set(kelimeler.length > 0 ? kelimeler : katla(ad).split(/\s+/).filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let kesisim = 0;
  for (const x of a) if (b.has(x)) kesisim++;
  return kesisim / (a.size + b.size - kesisim);
}

export interface OkulAdayi { id: string; name: string }

export type EslesmeGuveni = "kesin" | "onerilen" | "yok";

export interface EslesmeSonucu {
  raporKurum: string;
  okul: OkulAdayi | null;
  guven: EslesmeGuveni;
  /** 0..1 — "onerilen" için benzerlik; kullanıcıya gösterilir */
  benzerlik: number;
  /** Yakın diğer adaylar — kullanıcı seçerken işine yarar */
  digerAdaylar: OkulAdayi[];
}

/**
 * Tek bir kurum adını okullarla eşleştirir.
 *
 * - **kesin**: ayırt edici kelime kümeleri birebir aynı (sıra önemsiz)
 * - **onerilen**: tek bir aday belirgin şekilde öne çıkıyor (benzerlik ≥ 0.6
 *   ve ikinciyle arasında en az 0.15 fark) — kullanıcı onaylamalı
 * - **yok**: hiçbiri, ya da iki aday başa baş
 *
 * Alt küme eşleşmesi BİLEREK kabul edilmiyor: "Final Eğitim Kurumları" ile
 * "Final Akademi Eğitim Kurumları" farklı kurumlar ve ikisi de raporda var;
 * alt küme kuralı bunları birbirine bağlardı.
 */
export function kurumEslestir(raporKurum: string, okullar: OkulAdayi[]): EslesmeSonucu {
  const hedef = anahtarKelimeler(raporKurum);
  const puanlar = okullar
    .map((o) => ({ okul: o, puan: jaccard(hedef, anahtarKelimeler(o.name)) }))
    .sort((a, b) => b.puan - a.puan);

  const en = puanlar[0];
  const ikinci = puanlar[1];
  const digerAdaylar = puanlar.filter((p) => p.puan >= 0.3).slice(0, 4).map((p) => p.okul);

  if (!en || en.puan === 0) {
    return { raporKurum, okul: null, guven: "yok", benzerlik: 0, digerAdaylar: [] };
  }
  if (en.puan === 1) {
    return { raporKurum, okul: en.okul, guven: "kesin", benzerlik: 1, digerAdaylar };
  }
  if (en.puan >= 0.6 && (!ikinci || en.puan - ikinci.puan >= 0.15)) {
    return { raporKurum, okul: en.okul, guven: "onerilen", benzerlik: en.puan, digerAdaylar };
  }
  return { raporKurum, okul: null, guven: "yok", benzerlik: en.puan, digerAdaylar };
}

/* ------------------------------------------------------------ şehir --- */

const ILLER = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan",
  "Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu",
  "Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne",
  "Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay",
  "Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu",
  "Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya",
  "Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya",
  "Samsun","Şanlıurfa","Siirt","Sinop","Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli",
  "Uşak","Van","Yalova","Yozgat","Zonguldak",
];
const IL_ANAHTAR = ILLER.map((il) => ({ il, k: katla(il) }));

/**
 * Kurum ve şube adlarından şehir çıkarmaya çalışır.
 * `schools.city` NOT NULL olduğu için yeni okul eklerken bir değer gerekiyor;
 * bulunamazsa null döner ve kullanıcıdan istenir.
 */
export function sehirTahminEt(kurumAdi: string, subeAdlari: string[]): string | null {
  const havuz = katla([kurumAdi, ...subeAdlari].join(" "));
  const kelimeler = new Set(havuz.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
  for (const { il, k } of IL_ANAHTAR) {
    if (kelimeler.has(k)) return il;
  }
  return null;
}

/**
 * Bir kesitteki tüm kurumları toplu eşleştirir.
 *
 * Tek tek eşleştirmenin yakalayamadığı bir tehlike var: iki farklı rapor
 * kurumu aynı CRM okuluna eşleşebilir. Örneğin "Final Eğitim Kurumları" ve
 * "Final Akademi Eğitim Kurumları" — ikisi de raporda ayrı kurum ama CRM'de
 * tek bir "Final Okulları" kaydı varsa biri yanlış bağlanır.
 *
 * Bu durumda ikisi de "onerilen"e düşürülür: sessizce yanlış bağlamak yerine
 * kullanıcıdan karar istenir.
 */
export function kurumlariEslestir(
  raporKurumlari: string[],
  okullar: OkulAdayi[]
): EslesmeSonucu[] {
  const sonuclar = raporKurumlari.map((k) => kurumEslestir(k, okullar));

  const okulSahipleri = new Map<string, number>();
  for (const s of sonuclar) {
    if (s.okul) okulSahipleri.set(s.okul.id, (okulSahipleri.get(s.okul.id) ?? 0) + 1);
  }

  return sonuclar.map((s) =>
    s.okul && (okulSahipleri.get(s.okul.id) ?? 0) > 1
      ? { ...s, guven: "onerilen" as const }
      : s
  );
}

/** Ekranda özet göstermek için. */
export function eslesmeOzeti(sonuclar: EslesmeSonucu[]) {
  return {
    kesin:     sonuclar.filter((s) => s.guven === "kesin").length,
    onerilen:  sonuclar.filter((s) => s.guven === "onerilen").length,
    yok:       sonuclar.filter((s) => s.guven === "yok").length,
    toplam:    sonuclar.length,
  };
}

/* ------------------------------------------------- hatırlanan kararlar --- */

/** Bir kurum için kullanıcının kararı. */
export type Karar =
  | { tip: "okul"; schoolId: string }
  | { tip: "yeni"; sehir: string }
  | { tip: "yok" };

/**
 * Daha önce kaydedilmiş bir eşleştirme kararı.
 * `schoolId: null` = kullanıcı bilerek "Bağlama" demiş — karar YOK demek değil.
 */
export interface OncekiKarar {
  schoolId: string | null;
  /** Kararın alındığı kesitin tarihi — ekranda gösterilir */
  tarih: string;
}

export type KararDurumu =
  /** Önceki kesitten hatırlandı — kullanıcıya sormaya gerek yok */
  | "hatirlandi"
  /** İlk kez görülüyor, ad birebir tutuyor */
  | "otomatik"
  /** İlk kez görülüyor, tek aday öne çıkıyor ama onay gerekir */
  | "onay"
  /** İlk kez görülüyor, karşılığı yok */
  | "yeni";

export interface HazirKararlar {
  kararlar: Record<string, Karar>;
  durumlar: Record<string, KararDurumu>;
  eslesmeler: EslesmeSonucu[];
}

/**
 * Başlangıç kararlarını üretir: önce HATIRLANAN karar, yoksa bulanık eşleştirme.
 *
 * Hatırlanan karar bulanık eşleştirmeyi ezer, çünkü kullanıcının elle verdiği
 * karar algoritmanın tahmininden daha doğrudur — kullanıcı bir kurumu adı hiç
 * benzemeyen bir okula bağlamış olabilir.
 *
 * Hatırlanan okul artık silinmişse karar düşer ve kurum yeniden sorulur;
 * yoksa var olmayan bir id ile kaydetmeye çalışırdık.
 */
export function kararlariHazirla(
  kurumAdlari: string[],
  okullar: OkulAdayi[],
  subeAdlari: Map<string, string[]>,
  oncekiler: Record<string, OncekiKarar>,
): HazirKararlar {
  const eslesmeler = kurumlariEslestir(kurumAdlari, okullar);
  const okulVar = new Set(okullar.map((o) => o.id));

  const kararlar: Record<string, Karar> = {};
  const durumlar: Record<string, KararDurumu> = {};

  for (const e of eslesmeler) {
    const onceki = oncekiler[e.raporKurum];
    const hatirlanabilir =
      onceki !== undefined &&
      (onceki.schoolId === null || okulVar.has(onceki.schoolId));

    if (hatirlanabilir) {
      kararlar[e.raporKurum] = onceki.schoolId === null
        ? { tip: "yok" }
        : { tip: "okul", schoolId: onceki.schoolId };
      durumlar[e.raporKurum] = "hatirlandi";
      continue;
    }

    kararlar[e.raporKurum] = e.okul
      ? { tip: "okul", schoolId: e.okul.id }
      : { tip: "yeni", sehir: sehirTahminEt(e.raporKurum, subeAdlari.get(e.raporKurum) ?? []) ?? "" };
    durumlar[e.raporKurum] = e.okul
      ? (e.guven === "kesin" ? "otomatik" : "onay")
      : "yeni";
  }

  return { kararlar, durumlar, eslesmeler };
}

/** Kullanıcıya sorulması gereken kurum sayısı — 0 ise eşleştirme ekranı atlanabilir. */
export function ilgiGerekenSayisi(durumlar: Record<string, KararDurumu>): number {
  return Object.values(durumlar).filter((d) => d !== "hatirlandi").length;
}
