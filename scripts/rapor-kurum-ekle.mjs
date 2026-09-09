#!/usr/bin/env node
/**
 * Eski tamamlama raporlarına "Kurum" sütunu ekler.
 *
 * NEDEN: bazı eski raporlarda yalnızca "Şube" sütunu var, "Kurum" yok.
 * Kesit hesabı kurum düzeyinde çalıştığı için bu dosyalar olduğu gibi
 * yüklenemiyor.
 *
 * NEDEN BU BETİK: rapor ad-soyad ve e-posta içeriyor. Dosya bu makineden
 * hiç çıkmaz; betik yerelde çalışır, kişisel veri hiçbir yere gönderilmez.
 * (Projenin temel kuralı — bkz. CLAUDE.md ve kesit.ts başlığı.)
 *
 * KULLANIM — iki adım
 *
 *   1) Eşleştirme şablonunu üret:
 *        node scripts/rapor-kurum-ekle.mjs eski.xlsx --kurumlar yeni.xlsx
 *
 *      `yeni.xlsx` hem Kurum hem Şube taşıyan GÜNCEL rapordur. Şablon oradan
 *      DOLU gelir: aynı şube adı iki raporda da varsa kurum doğrudan alınır
 *      (kesin), yoksa kurum adları içinde en yakını ÖNERİLİR (gözden geçirin).
 *      --kurumlar verilmezse şablon boş üretilir.
 *
 *   2) Kurum sütunlu yeni dosyayı yaz:
 *        node scripts/rapor-kurum-ekle.mjs eski.xlsx eski.eslestirme.json
 *      → eski.kurumlu.xlsx oluşur. Özgün dosyaya DOKUNULMAZ.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import xlsx from "xlsx";

const SUBE_ADAYLARI = ["şube", "sube", "kampüs", "kampus", "birim", "okul"];
const KURUM_BASLIGI = "Kurum";

/*
 * Kurum adı benzerliği. components/reports/kurum-eslestir.ts ile AYNI
 * mantık ama ayrı iş: orada kurum→okul eşleşir, burada şube→kurum.
 * Ölçüt Jaccard değil KAPSAMA: kurum adı genelde şube adının içinde geçer
 * ("BİLNET BODRUM" ⊃ "BİLNET"), Jaccard bunu düşük puanlardı.
 */
const GENEL_KELIMELER = new Set([
  "ozel", "okullari", "okulu", "okul", "koleji", "kolej", "kolejleri",
  "egitim", "egitimleri", "kurumlari", "kurumu", "kurum", "anadolu",
  "lisesi", "lise", "ortaokulu", "ortaokul", "ilkokulu", "ilkokul",
  "anaokulu", "anaokul", "kampusu", "kampus", "sube", "subesi",
  "ve", "ile", "as", "ltd", "sti", "genel", "merkez", "merkezi",
]);

/*
 * İller — küme adı olamaz. "İSTANBUL FLORYA FİNAL", "İstanbul Lider Koleji"
 * ve "İSTANBUL GÜNEŞLİ FİNALOKULLARI" ortak kelime "istanbul" yüzünden aynı
 * kuruma toplanmıştı; üçü ayrı kurum.
 * Kaynak: components/reports/kurum-eslestir.ts (ILLER) — orada değişirse
 * burası da güncellenmeli.
 */
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

/** Küme adı olamayacak kelimeler: iller + fazla genel olanlar. */
const KUME_OLAMAZ = new Set([
  ...ILLER.map((il) => katlaHam(il)),
  "akademi", "grubu", "grup", "vip", "genel", "merkez", "merkezi", "mtal",
]);

/*
 * Unicode birleştirme. Eski raporlarda bazı adlar NFD geliyor: "Ç" tek
 * karakter değil C + birleşen çengel (0043 0327). Görüntüde aynı, string
 * karşılaştırmasında farklı — "Anamur Çözüm Akademi" eşleşmeden geçiyordu.
 * (09.09.2026 raporunda bu sorun yok, ölçüldü; eski dosyalarda var.)
 */
function nfc(s) {
  return String(s ?? "").normalize("NFC").trim();
}

function katlaHam(s) {
  return s.replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o").replace(/[Üü]/g, "u").replace(/[Ğğ]/g, "g").toLowerCase();
}

function katla(s) {
  return s.replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o").replace(/[Üü]/g, "u").replace(/[Ğğ]/g, "g").toLowerCase();
}

function anahtarKelimeler(ad) {
  const k = katla(ad).replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !GENEL_KELIMELER.has(w));
  return new Set(k.length > 0 ? k : katla(ad).split(/\s+/).filter(Boolean));
}

/** 0..1 — kesişim / küçük kümenin boyutu. */
function kapsama(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let kesisim = 0;
  for (const w of a) if (b.has(w)) kesisim++;
  return kesisim / Math.min(a.size, b.size);
}

function kesisimSayisi(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/**
 * Şube adına en yakın kurumu bulur.
 *
 * Beraberlik KESİŞİM BÜYÜKLÜĞÜ ile bozulur. "ADANA BATI ADANA FİNAL AKADEMİ"
 * hem "Final Eğitim Kurumları" hem "Final Akademi Eğitim Kurumları" ile
 * kapsama 1,00 veriyor; doğrusu iki kelimesi birden tutan ikincisi.
 * Kesişim de eşitse öneri yapılmaz — iki gerçek kurum arasında kura
 * çekmektense boş bırakıp insana sormak doğru.
 */
function enYakinKurum(subeAdi, kurumlar) {
  const a = anahtarKelimeler(subeAdi);
  let enIyi = null, puan = 0, kesisim = 0, berabere = false;

  for (const [kurum, kelimeler] of kurumlar) {
    const p = kapsama(a, kelimeler);
    /*
     * 0,5 REDDEDİLİR: iki tarafta da 2+ kelime varken tek kelimenin tutması
     * yeterli değil. Gerçek yanlışlar hep böyle geldi — ortak kelime şehir
     * ya da ilçe adı çıkıyordu:
     *   "Ankara Çözüm Koleji"  → "ODTÜ GVO ANKARA"        (ankara)
     *   "BİLNET ÇAMLICA"       → "Çamlıca İsabet Okulları" (camlica)
     *   "Bilim Yaşam"          → "İstanbul Bilim Koleji"   (bilim)
     * Yanlış dolu gelen bir satır, boş satırdan kötüdür: gözden kaçar.
     * Kurum adı tek ayırt edici kelimeyse (ALKEV ⊂ "ALKEV Bahçeşehir")
     * kapsama 1,00 olur ve geçer.
     */
    if (p <= 0.5) continue;
    const k = kesisimSayisi(a, kelimeler);
    if (p > puan || (p === puan && k > kesisim)) {
      enIyi = kurum; puan = p; kesisim = k; berabere = false;
    } else if (p === puan && k === kesisim) {
      berabere = true;
    }
  }
  return enIyi && !berabere ? { kurum: enIyi, puan } : null;
}

/**
 * Bu yılki listede karşılığı olmayan şubeleri KENDİ ARALARINDA kümeler.
 *
 * Bir kurum bu yıl raporda yoksa (ör. BİLNET, Çözüm, Bilim Yaşam — geçen
 * dönem vardı, bu dönem yok) adı bu yılki listeden türetilemez. Ama eski
 * şubeler ortak bir ayırt edici kelime taşıyor: "BİLNET BODRUM",
 * "BİLNET KARTAL"… → "BİLNET". En az iki şubede geçen kelime aday olur.
 */
function kumeAdiOner(subeler) {
  const sayac = new Map();
  const kelimeler = new Map();
  // Katlanmış kelime → özgün yazımı. "cozum" yerine "Çözüm" önerilsin diye.
  const ozgunYazim = new Map();
  for (const s of subeler) {
    const k = anahtarKelimeler(s);
    kelimeler.set(s, k);
    for (const w of k) sayac.set(w, (sayac.get(w) ?? 0) + 1);
    for (const ham of s.split(/[^\p{L}\p{N}]+/u)) {
      const f = katla(ham);
      if (f && k.has(f) && !ozgunYazim.has(f)) ozgunYazim.set(f, ham);
    }
  }
  const oneri = new Map();
  for (const s of subeler) {
    let enIyi = null, enCok = 1;
    for (const w of kelimeler.get(s)) {
      // 3 harften kısa parçalar ("zu") ve il/jenerik kelimeler küme adı olamaz
      if (w.length < 3 || KUME_OLAMAZ.has(w)) continue;
      const n = sayac.get(w) ?? 0;
      if (n > enCok) { enCok = n; enIyi = w; }
    }
    if (enIyi) oneri.set(s, { ad: ozgunYazim.get(enIyi) ?? enIyi, adet: enCok });
  }
  return oneri;
}

function cikis(mesaj) {
  console.error(`\n  ✗ ${mesaj}\n`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const bayrak = argv.indexOf("--kurumlar");
const kurumKaynagi = bayrak >= 0 ? argv[bayrak + 1] : null;
if (bayrak >= 0) argv.splice(bayrak, 2);
const [dosyaYolu, eslestirmeYolu] = argv;

if (!dosyaYolu) {
  cikis(
    "Kullanım:\n" +
    "    node scripts/rapor-kurum-ekle.mjs <eski.xlsx> --kurumlar <guncel.xlsx>\n" +
    "    node scripts/rapor-kurum-ekle.mjs <eski.xlsx> <eslestirme.json>"
  );
}
if (bayrak >= 0 && !kurumKaynagi) cikis("--kurumlar için dosya yolu verilmedi.");
if (!existsSync(dosyaYolu)) cikis(`Dosya bulunamadı: ${dosyaYolu}`);

const wb = xlsx.read(readFileSync(dosyaYolu), { cellDates: false });

/** Şube sütunu olan İLK sayfayı bulur. */
function sayfaSec() {
  for (const ad of wb.SheetNames) {
    const satirlar = xlsx.utils.sheet_to_json(wb.Sheets[ad], { defval: "" });
    if (satirlar.length === 0) continue;
    const basliklar = Object.keys(satirlar[0]);
    const sube = basliklar.find((b) =>
      SUBE_ADAYLARI.some((s) => b.toLocaleLowerCase("tr").includes(s)));
    if (sube) return { ad, satirlar, basliklar, subeBasligi: sube };
  }
  return null;
}

const sayfa = sayfaSec();
if (!sayfa) {
  cikis(
    `Şube sütunu olan sayfa bulunamadı.\n    Bakılan sayfalar: ${wb.SheetNames.join(" · ")}\n` +
    `    Aranan başlık kelimeleri: ${SUBE_ADAYLARI.join(" · ")}`
  );
}

const { ad: sayfaAdi, satirlar, basliklar, subeBasligi } = sayfa;

if (basliklar.includes(KURUM_BASLIGI)) {
  cikis(`Bu dosyada zaten "${KURUM_BASLIGI}" sütunu var (sayfa: ${sayfaAdi}). Değişiklik gerekmez.`);
}

// Şubeler — sırayı koruyarak tekilleştir
const subeler = [...new Set(satirlar.map((r) => nfc(r[subeBasligi])).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "tr"));

console.log(`\n  Sayfa: ${sayfaAdi}   Satır: ${satirlar.length}   Şube sütunu: "${subeBasligi}"`);
console.log(`  Farklı şube: ${subeler.length}\n`);

const varsayilanEslestirmeYolu = join(
  dirname(dosyaYolu),
  basename(dosyaYolu).replace(/\.xlsx?$/i, "") + ".eslestirme.json"
);

/* --------------------------------------------- 1. adım: şablon üret --- */
if (!eslestirmeYolu) {
  const sablon = {};
  let kesin = 0, onerilen = 0;
  const gozdenGecir = [];

  if (kurumKaynagi) {
    if (!existsSync(kurumKaynagi)) cikis(`Güncel rapor bulunamadı: ${kurumKaynagi}`);
    const kwb = xlsx.read(readFileSync(kurumKaynagi));
    let subeKurum = null, kurumAdlari = null;

    for (const ad of kwb.SheetNames) {
      const rs = xlsx.utils.sheet_to_json(kwb.Sheets[ad], { defval: "" });
      if (rs.length === 0) continue;
      const bs = Object.keys(rs[0]);
      const kb = bs.find((b) => b.toLocaleLowerCase("tr").includes("kurum"));
      const sb = bs.find((b) => SUBE_ADAYLARI.some((x) => b.toLocaleLowerCase("tr").includes(x)));
      if (!kb || !sb) continue;
      subeKurum = new Map();
      kurumAdlari = new Set();
      for (const r of rs) {
        const su = nfc(r[sb]), ku = nfc(r[kb]);
        if (ku) kurumAdlari.add(ku);
        if (su && ku && !subeKurum.has(su)) subeKurum.set(su, ku);
      }
      break;
    }
    if (!subeKurum) cikis(`Güncel raporda hem Kurum hem Şube sütunu olan sayfa bulunamadı: ${kurumKaynagi}`);

    const kurumKelimeleri = new Map([...kurumAdlari].map((k) => [k, anahtarKelimeler(k)]));
    console.log(`  Güncel rapor: ${subeKurum.size} şube → ${kurumAdlari.size} kurum\n`);

    const kalanlar = [];
    for (const su of subeler) {
      const dogrudan = subeKurum.get(su);
      if (dogrudan) { sablon[su] = dogrudan; kesin++; continue; }
      const oneri = enYakinKurum(su, kurumKelimeleri);
      if (oneri) {
        sablon[su] = oneri.kurum; onerilen++;
        gozdenGecir.push({ sube: su, kurum: oneri.kurum, puan: oneri.puan, kaynak: "bu yıl" });
      } else {
        kalanlar.push(su);
      }
    }

    // Bu yıl karşılığı olmayanlar kendi aralarında kümelenir
    const kumeler = kumeAdiOner(kalanlar);
    for (const su of kalanlar) {
      const k = kumeler.get(su);
      if (k) {
        sablon[su] = k.ad; onerilen++;
        gozdenGecir.push({ sube: su, kurum: k.ad, puan: 0, kaynak: `küme (${k.adet} şube)` });
      } else {
        sablon[su] = "";
        gozdenGecir.push({ sube: su, kurum: "", puan: 0, kaynak: "" });
      }
    }
  } else {
    for (const s of subeler) sablon[s] = "";
  }

  writeFileSync(varsayilanEslestirmeYolu, JSON.stringify(sablon, null, 2) + "\n", "utf8");

  if (kurumKaynagi) {
    const bos = subeler.length - kesin - onerilen;
    console.log(`  Doğrudan eşleşen (şube adı birebir aynı) : ${kesin}`);
    console.log(`  Önerilen (ada göre, GÖZDEN GEÇİRİN)      : ${onerilen}`);
    console.log(`  Boş kalan (elle doldurun)                : ${bos}\n`);

    if (gozdenGecir.length > 0) {
      console.log(`  --- gözden geçirilecekler (güven sırasına göre, düşük önce) ---`);
      gozdenGecir.sort((a, b) => (a.kurum ? 1 : 0) - (b.kurum ? 1 : 0) || a.puan - b.puan
        || a.sube.localeCompare(b.sube, "tr"));
      for (const g of gozdenGecir) {
        const etiket = g.kaynak ? `[${g.kaynak}]` : "[BOŞ]";
        console.log(`    ${etiket.padEnd(16)} ${g.sube}  →  ${g.kurum || "(elle doldurun)"}`);
      }
      console.log("");
    }
  } else {
    for (const s of subeler.slice(0, 15)) console.log(`    ${s}`);
    if (subeler.length > 15) console.log(`    … ve ${subeler.length - 15} tane daha`);
    console.log(`\n  İpucu: --kurumlar <guncel.xlsx> verirseniz şablon dolu gelir.`);
  }

  console.log(`  → Şablon yazıldı: ${varsayilanEslestirmeYolu}`);
  console.log(`\n  Sonra:  node scripts/rapor-kurum-ekle.mjs "${dosyaYolu}" "${varsayilanEslestirmeYolu}"\n`);
  process.exit(0);
}

/* ------------------------------------- 2. adım: kurum sütununu yaz --- */
if (!existsSync(eslestirmeYolu)) cikis(`Eşleştirme dosyası bulunamadı: ${eslestirmeYolu}`);

let eslestirme;
try {
  eslestirme = JSON.parse(readFileSync(eslestirmeYolu, "utf8"));
} catch (e) {
  cikis(`Eşleştirme dosyası okunamadı (geçerli JSON değil): ${e.message}`);
}

// Eşleştirme dosyası NFC yazılıyor; okurken de NFC ile aranır
const eslestirmeNfc = Object.fromEntries(Object.entries(eslestirme).map(([k, v]) => [nfc(k), v]));
const eksik = subeler.filter((s) => !String(eslestirmeNfc[s] ?? "").trim());
if (eksik.length > 0) {
  console.error(`\n  ✗ ${eksik.length} şubenin kurumu boş. Doldurmadan devam edilmez —`);
  console.error(`    boş bırakılsa o satırlar sessizce kurumsuz kalırdı.\n`);
  for (const s of eksik.slice(0, 20)) console.error(`    ${s}`);
  if (eksik.length > 20) console.error(`    … ve ${eksik.length - 20} tane daha`);
  console.error("");
  process.exit(1);
}

// Kurum sütunu, Şube'nin hemen SOLUNA eklenir (bu yılki raporun sırası böyle)
const subeIndex = basliklar.indexOf(subeBasligi);
const yeniBasliklar = [
  ...basliklar.slice(0, subeIndex),
  KURUM_BASLIGI,
  ...basliklar.slice(subeIndex),
];

const yeniSatirlar = satirlar.map((r) => {
  const sube = nfc(r[subeBasligi]);
  const cikti = {};
  for (const b of yeniBasliklar) {
    cikti[b] = b === KURUM_BASLIGI ? (eslestirmeNfc[sube] ?? "") : r[b];
  }
  return cikti;
});

const yeniWb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(yeniWb, xlsx.utils.json_to_sheet(yeniSatirlar, { header: yeniBasliklar }), sayfaAdi);

const ciktiYolu = join(
  dirname(dosyaYolu),
  basename(dosyaYolu).replace(/\.xlsx?$/i, "") + ".kurumlu.xlsx"
);
writeFileSync(ciktiYolu, xlsx.write(yeniWb, { type: "buffer", bookType: "xlsx" }));

const kurumSayisi = new Set(Object.values(eslestirme).map((v) => String(v).trim())).size;
console.log(`  ✓ ${satirlar.length} satır · ${subeler.length} şube → ${kurumSayisi} kurum`);
console.log(`  ✓ Yazıldı: ${ciktiYolu}`);
console.log(`    Özgün dosyaya dokunulmadı.\n`);
