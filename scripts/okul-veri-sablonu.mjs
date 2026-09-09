#!/usr/bin/env node
/**
 * Okul profil eksikleri için doldurulacak Excel üretir.
 *
 * AKIŞ
 *   1) supabase/sorgular/okul_eksikleri.sql'i SQL Editor'de çalıştırıp
 *      sonucu "Download CSV" ile indirin
 *   2) node scripts/okul-veri-sablonu.mjs okullar.csv
 *      → okul-veri-girisi.xlsx  (doldurulacak)
 *   3) Doldurun, sonra:
 *      node scripts/okul-veri-sql.mjs okul-veri-girisi.xlsx
 *      → okul-veri-girisi.sql  (SQL Editor'de çalıştırılır)
 *
 * NEDEN CSV'DEN: okul id'leri gerekiyor. Ada göre eşleştirme, adı benzeyen
 * iki okulda yanlış satırı günceller; id ile böyle bir risk yok.
 *
 * Yalnız EKSİĞİ OLAN okullar yazılır — tamam olanları listeye koymak
 * gereksiz iş ve yanlışlıkla üzerine yazma riski.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import xlsx from "xlsx";

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

const [, , csvYolu] = process.argv;
if (!csvYolu) {
  console.error("\n  Kullanım: node scripts/okul-veri-sablonu.mjs <okullar.csv>\n");
  process.exit(1);
}
if (!existsSync(csvYolu)) { console.error(`\n  ✗ Bulunamadı: ${csvYolu}\n`); process.exit(1); }

/*
 * CSV UTF-8 OLARAK OKUNUR. xlsx, ham buffer verildiğinde CSV'yi UTF-8
 * saymıyor ve Türkçe karakterler bozuluyor:
 *   "Okulları" → "OkullarÄ±",  "İstanbul" → "Ä°stanbul"
 * Metne çevirip `type: "string"` vermek bunu kesin çözer. Baştaki BOM
 * ayrıca temizlenir, yoksa ilk sütun adının başına yapışır.
 */
const csvMetin = readFileSync(csvYolu, "utf8").replace(/^\uFEFF/, "");
const wb = xlsx.read(csvMetin, { type: "string", raw: true });
const satirlar = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
if (satirlar.length === 0) { console.error("\n  ✗ CSV boş.\n"); process.exit(1); }

/*
 * Bozuk kodlama sessizce geçmesin. İki yön de kontrol edilir:
 *  - U+FFFD: dosya UTF-8 DEĞİL (ör. Windows-1254 / ISO-8859-9), okunamayan bayt
 *  - "Ä±", "Ã¶"...: dosya bir kez daha yanlış çevrilmiş (UTF-8, Latin-1 sanılmış)
 * İlk sürüm yalnız ikinciye bakıyordu ve ISO-8859-9 dosyayı sessizce geçiriyordu.
 */
if (csvMetin.includes("\uFFFD")) {
  console.error("\n  ✗ CSV UTF-8 değil — okunamayan karakter var.");
  console.error("    Supabase → SQL Editor → sonuç tablosunun üstündeki \"Download CSV\" ile indirin.\n");
  process.exit(1);
}
if (/Ä±|Ä°|ÅŸ|Ã¼|Ã¶|ÄŸ|Ã§|Ã–|Ãœ/.test(csvMetin)) {
  console.error("\n  ✗ CSV'de bozuk Türkçe karakter var (bir kez fazla çevrilmiş).");
  console.error("    Örnek: \"Okulları\" yerine \"OkullarÄ±\". Dosyayı yeniden indirin.\n");
  process.exit(1);
}

const gerekli = ["id", "okul_adi", "il", "ilce", "koordinator_sayisi", "sozlesme_sayisi", "beklenen_ogretmen"];
const eksikSutun = gerekli.filter((k) => !(k in satirlar[0]));
if (eksikSutun.length > 0) {
  console.error(`\n  ✗ CSV'de şu sütunlar yok: ${eksikSutun.join(", ")}`);
  console.error(`    Bulunan: ${Object.keys(satirlar[0]).join(", ")}`);
  console.error(`    supabase/sorgular/okul_eksikleri.sql çıktısını kullanın.\n`);
  process.exit(1);
}

const say = (v) => Number(temiz(v) || 0);
/*
 * Supabase CSV dışa aktarımı NULL'ları "null" METNİ olarak yazıyor.
 * Şablona olduğu gibi kopyalanınca kullanıcı 101 hücrede "null" görüyor ve
 * dolu sanıp bırakıyor; sonra sayıya çevrilemiyor. Boş sayılır.
 */
const NULL_METINLERI = new Set(["null", "NULL", "undefined", "-"]);
const temiz = (v) => {
  const s = String(v ?? "").trim();
  return NULL_METINLERI.has(s) ? "" : s;
};
const bos = (v) => temiz(v) === "";

const eksikli = satirlar.filter((r) =>
  bos(r.il) || temiz(r.il) === "Belirtilmedi" || bos(r.ilce) ||
  say(r.koordinator_sayisi) === 0 || say(r.sozlesme_sayisi) === 0 || bos(r.beklenen_ogretmen)
);

// --- 1. sayfa: okul bilgileri + sözleşme ---
const okulSayfasi = eksikli.map((r) => ({
  "okul_id (DEĞİŞTİRMEYİN)": r.id,
  "Okul Adı (DEĞİŞTİRMEYİN)": r.okul_adi,
  "İl": temiz(r.il) === "Belirtilmedi" ? "" : temiz(r.il),
  "İlçe": temiz(r.ilce),
  "Beklenen Öğretmen": temiz(r.beklenen_ogretmen),
  "Sözleşme Başlangıç (GG.AA.YYYY)": "",
  "Sözleşme Bitiş (GG.AA.YYYY)": "",
  "Sözleşme Bedeli (TL)": "",
  "Sözleşme Durumu": say(r.sozlesme_sayisi) > 0 ? "(var)" : "aktif",
  "Ödeme Durumu": say(r.sozlesme_sayisi) > 0 ? "(var)" : "odeme_bekleniyor",
  "Not": "",
}));

// --- 2. sayfa: koordinatörler (KİŞİSEL VERİ) ---
const koordinatorSayfasi = eksikli
  .filter((r) => say(r.koordinator_sayisi) === 0)
  .map((r) => ({
    "okul_id (DEĞİŞTİRMEYİN)": r.id,
    "Okul Adı (DEĞİŞTİRMEYİN)": r.okul_adi,
    "Ad Soyad": "",
    "Ünvan": "",
    "E-posta": "",
    "Telefon": "",
  }));

// --- 3. sayfa: yardım ---
const yardim = [
  { Alan: "İl", Açıklama: "81 ilden biri, tam yazımıyla. Boş bırakırsanız o okulun konumu eksik kalır." },
  { Alan: "İlçe", Açıklama: "Serbest metin. İl dolu, ilçe boşsa 'Konum' rozeti gitmez — ikisi de gerekir." },
  { Alan: "Beklenen Öğretmen", Açıklama: "Sözleşmede taahhüt edilen öğretmen sayısı. Sayı." },
  { Alan: "Sözleşme tarihleri", Açıklama: "GG.AA.YYYY. İkisi de zorunlu; biri boşsa o okul için sözleşme yazılmaz." },
  { Alan: "Sözleşme Bedeli", Açıklama: "Sayı, TL. Boş bırakılırsa 0 yazılır." },
  { Alan: "Sözleşme Durumu", Açıklama: "aktif · suresi_doldu · iptal" },
  { Alan: "Ödeme Durumu", Açıklama: "odeme_bekleniyor · kismi · tamamlandi" },
  { Alan: "(var)", Açıklama: "O okulda zaten sözleşme kayıtlı. Yeni bir tane eklemek istemiyorsanız satırı boş bırakın." },
  { Alan: "Koordinatörler sayfası", Açıklama: "KİŞİSEL VERİ içerir (ad, e-posta, telefon). Doldurmak isteğe bağlıdır." },
  { Alan: "İl listesi", Açıklama: ILLER.join(" · ") },
];

const cikti = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(cikti, xlsx.utils.json_to_sheet(okulSayfasi), "Okul ve Sözleşme");
xlsx.utils.book_append_sheet(cikti, xlsx.utils.json_to_sheet(koordinatorSayfasi), "Koordinatörler");
xlsx.utils.book_append_sheet(cikti, xlsx.utils.json_to_sheet(yardim), "Yardım");

const ciktiYolu = join(dirname(csvYolu), "okul-veri-girisi.xlsx");
writeFileSync(ciktiYolu, xlsx.write(cikti, { type: "buffer", bookType: "xlsx" }));

const konumEksik = eksikli.filter((r) => bos(r.il) || temiz(r.il) === "Belirtilmedi" || bos(r.ilce)).length;
const koordEksik = eksikli.filter((r) => say(r.koordinator_sayisi) === 0).length;
const sozEksik = eksikli.filter((r) => say(r.sozlesme_sayisi) === 0).length;
const beklEksik = eksikli.filter((r) => bos(r.beklenen_ogretmen)).length;

console.log(`\n  Toplam okul   : ${satirlar.length}`);
console.log(`  Eksiği olan   : ${eksikli.length}`);
console.log(`    konum       : ${konumEksik}`);
console.log(`    koordinatör : ${koordEksik}`);
console.log(`    sözleşme    : ${sozEksik}`);
console.log(`    beklenen öğr: ${beklEksik}`);
console.log(`\n  → ${ciktiYolu}`);
console.log(`\n  Doldurduktan sonra:  node scripts/okul-veri-sql.mjs "${ciktiYolu}"\n`);
