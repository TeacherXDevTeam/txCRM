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
 *   1) Şubeleri listele ve eşleştirme şablonu üret:
 *        node scripts/rapor-kurum-ekle.mjs rapor.xlsx
 *      → rapor.eslestirme.json dosyası oluşur; "" olan yerleri doldurun.
 *
 *   2) Kurum sütunlu yeni dosyayı yaz:
 *        node scripts/rapor-kurum-ekle.mjs rapor.xlsx rapor.eslestirme.json
 *      → rapor.kurumlu.xlsx oluşur. Özgün dosyaya DOKUNULMAZ.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import xlsx from "xlsx";

const SUBE_ADAYLARI = ["şube", "sube", "kampüs", "kampus", "birim", "okul"];
const KURUM_BASLIGI = "Kurum";

function cikis(mesaj) {
  console.error(`\n  ✗ ${mesaj}\n`);
  process.exit(1);
}

const [, , dosyaYolu, eslestirmeYolu] = process.argv;
if (!dosyaYolu) {
  cikis("Kullanım: node scripts/rapor-kurum-ekle.mjs <rapor.xlsx> [eslestirme.json]");
}
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
const subeler = [...new Set(satirlar.map((r) => String(r[subeBasligi] ?? "").trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "tr"));

console.log(`\n  Sayfa: ${sayfaAdi}   Satır: ${satirlar.length}   Şube sütunu: "${subeBasligi}"`);
console.log(`  Farklı şube: ${subeler.length}\n`);

const varsayilanEslestirmeYolu = join(
  dirname(dosyaYolu),
  basename(dosyaYolu).replace(/\.xlsx?$/i, "") + ".eslestirme.json"
);

/* --------------------------------------------- 1. adım: şablon üret --- */
if (!eslestirmeYolu) {
  const sablon = Object.fromEntries(subeler.map((s) => [s, ""]));
  writeFileSync(varsayilanEslestirmeYolu, JSON.stringify(sablon, null, 2) + "\n", "utf8");

  for (const s of subeler.slice(0, 15)) console.log(`    ${s}`);
  if (subeler.length > 15) console.log(`    … ve ${subeler.length - 15} tane daha`);

  console.log(`\n  → Eşleştirme şablonu yazıldı: ${varsayilanEslestirmeYolu}`);
  console.log(`    Her şubenin karşısına ait olduğu KURUM adını yazın.`);
  console.log(`    Bu yılki raporda geçen kurum adlarını kullanın ki eşleşsinler.`);
  console.log(`\n  Sonra:  node scripts/rapor-kurum-ekle.mjs ${dosyaYolu} ${varsayilanEslestirmeYolu}\n`);
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

const eksik = subeler.filter((s) => !String(eslestirme[s] ?? "").trim());
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
  const sube = String(r[subeBasligi] ?? "").trim();
  const cikti = {};
  for (const b of yeniBasliklar) {
    cikti[b] = b === KURUM_BASLIGI ? (eslestirme[sube] ?? "") : r[b];
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
