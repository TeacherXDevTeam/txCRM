#!/usr/bin/env node
/**
 * Doldurulmuş okul veri girişi Excel'ini SQL'e çevirir.
 *
 *   node scripts/okul-veri-sql.mjs okul-veri-girisi.xlsx
 *   → okul-veri-girisi.sql   (Supabase SQL Editor'de çalıştırılır)
 *
 * ÜRETİLEN SQL'İN İLKELERİ
 * - Okullar id ile güncellenir (ada göre değil) — yanlış satır riski yok
 * - Boş bırakılan alan YAZILMAZ; mevcut değerin üzerine boş geçilmez
 * - Sözleşme yalnız iki tarih de doluysa yazılır; yarım sözleşme üretilmez
 * - Her blok tek tek yazılır, tamamı bir transaction içinde: bir satır
 *   patlarsa hiçbiri yazılmaz, yarım kalmış giriş olmaz
 * - Metinler tek tırnak kaçışıyla güvenli hale getirilir
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import xlsx from "xlsx";

/*
 * contracts.created_by NOT NULL ve team_members'a bağlı. SQL Editor'de
 * auth.uid() null döner, o yüzden ilk admin'e düşülür. Geçici fonksiyon
 * yerine satır içi alt sorgu: daha az makine, daha az kırılma noktası.
 */
const KAYIT_SAHIBI =
  "(select id from team_members where role = 'admin' order by created_at limit 1)";

const DURUMLAR = new Set(["aktif", "suresi_doldu", "iptal"]);
const ODEMELER = new Set(["odeme_bekleniyor", "kismi", "tamamlandi"]);

const argv = process.argv.slice(2);
const bi = argv.indexOf("--bitis");
const varsayilanBitisHam = bi >= 0 ? argv[bi + 1] : null;
if (bi >= 0) argv.splice(bi, 2);
const [dosya] = argv;

if (!dosya) {
  console.error("\n  Kullanım: node scripts/okul-veri-sql.mjs <okul-veri-girisi.xlsx> [--bitis GG.AA.YYYY]");
  console.error("    --bitis: başlangıcı olup bitişi boş bırakılan satırlar için ortak bitiş tarihi\n");
  process.exit(1);
}
if (!existsSync(dosya)) { console.error(`\n  ✗ Bulunamadı: ${dosya}\n`); process.exit(1); }

const wb = xlsx.read(readFileSync(dosya));
const sayfa = (ad) => (wb.Sheets[ad] ? xlsx.utils.sheet_to_json(wb.Sheets[ad], { defval: "" }) : []);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
/* Supabase CSV'si NULL'u "null" metni olarak yazıyor — boş sayılır. */
const NULL_METINLERI = new Set(["null", "NULL", "undefined", "-"]);
const metin = (v) => {
  const s = String(v ?? "").trim();
  return NULL_METINLERI.has(s) ? "" : s;
};
const bos = (v) => metin(v) === "";
const sayi = (v) => {
  const n = Number(metin(v).replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
/** "GG.AA.YYYY" ya da Excel tarih sayısı → "YYYY-MM-DD" */
function tarihCevir(v) {
  const s = metin(v);
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
};

/*
 * "Sözleşme Durumu" sütunu iki farklı şeyi taşıyabiliyor. Kullanıcı 17 satırda
 * 'pasif' yazdı — bu bir sözleşme durumu DEĞİL, okul durumu (o kurumla
 * çalışılmıyor, sözleşme de yok). Ayrım değerin hangi enum'a ait olduğundan
 * çıkarılır; 'aktif' ikisinde de var, orada tarihlere bakılır.
 */
const OKUL_DURUMLARI = new Set(["aktif", "pasif", "potansiyel"]);
const YALNIZ_OKUL = new Set(["pasif", "potansiyel"]);

/*
 * Ortak bitiş tarihi. Kullanıcının dosyasında 84 satırda başlangıç vardı ama
 * bitiş yoktu ve hepsi aynı gün başlıyordu; her satırı elle doldurtmak yerine
 * bir kez verilir. YALNIZ BOŞ OLANLARA uygulanır — dosyada yazan bir bitiş
 * tarihi asla ezilmez.
 */
const varsayilanBitis = varsayilanBitisHam ? tarihCevir(varsayilanBitisHam) : null;
if (varsayilanBitisHam && !varsayilanBitis) {
  console.error(`\n  ✗ --bitis değeri okunamadı: "${varsayilanBitisHam}" (GG.AA.YYYY bekleniyor)\n`);
  process.exit(1);
}

const uyarilar = [];
const okulGuncelle = [];
const okulDurumu = [];
const sozlesmeEkle = [];
const sozlesmeGuncelle = [];

for (const [i, r] of sayfa("Okul ve Sözleşme").entries()) {
  const satirNo = i + 2;
  const id = metin(r["okul_id (DEĞİŞTİRMEYİN)"]);
  const ad = metin(r["Okul Adı (DEĞİŞTİRMEYİN)"]);
  if (!id) continue;

  const il = metin(r["İl"]), ilce = metin(r["İlçe"]);
  const set = [];
  if (il) set.push(`city = ${q(il)}`);
  if (ilce) set.push(`district = ${q(ilce)}`);
  if (set.length > 0) {
    okulGuncelle.push(`update schools set ${set.join(", ")}, updated_at = now() where id = ${q(id)};  -- ${ad}`);
  }

  const bas = tarihCevir(r["Sözleşme Başlangıç (GG.AA.YYYY)"]);
  // Dosyadaki bitiş önceliklidir; yoksa --bitis devreye girer
  const bit = tarihCevir(r["Sözleşme Bitiş (GG.AA.YYYY)"]) ?? (bas ? varsayilanBitis : null);
  const bekl = bos(r["Beklenen Öğretmen"]) ? null : sayi(r["Beklenen Öğretmen"]);
  const durum = metin(r["Sözleşme Durumu"]) || "aktif";
  const odeme = metin(r["Ödeme Durumu"]) || "odeme_bekleniyor";

  /*
   * Okulun zaten sözleşmesi varsa yeni bir tane AÇILMAZ. Ama "Beklenen
   * Öğretmen" doldurulmuşsa mevcut sözleşme güncellenir — yoksa o alan
   * sessizce yok sayılırdı ve rozet gitmezdi.
   */
  /*
   * Yalnız okula ait bir durum yazılmışsa ('pasif' / 'potansiyel'):
   * sözleşme AÇILMAZ, okulun durumu güncellenir.
   */
  if (YALNIZ_OKUL.has(durum)) {
    okulDurumu.push(`update schools set status = ${q(durum)}, updated_at = now() where id = ${q(id)};  -- ${ad}`);
    if (bas || bit) uyarilar.push(`satır ${satirNo} (${ad}): "${durum}" işaretli ama sözleşme tarihi de var — sözleşme yazılmadı`);
    continue;
  }

  if (durum === "(var)" || odeme === "(var)") {
    if (bekl !== null) {
      sozlesmeGuncelle.push(
        `update contracts set expected_teacher_count = ${bekl}, updated_at = now()\n` +
        `  where school_id = ${q(id)}\n` +
        `    and end_date = (select max(end_date) from contracts where school_id = ${q(id)});  -- ${ad}`
      );
    }
    continue;
  }

  if (bas && bit) {
    // Canlı sözleşmesi olan okul fiilen aktiftir
    if (durum === "aktif" && OKUL_DURUMLARI.has("aktif")) {
      okulDurumu.push(`update schools set status = 'aktif', updated_at = now() where id = ${q(id)};  -- ${ad}`);
    }
    if (!DURUMLAR.has(durum)) { uyarilar.push(`satır ${satirNo} (${ad}): geçersiz sözleşme durumu "${durum}"`); continue; }
    if (!ODEMELER.has(odeme)) { uyarilar.push(`satır ${satirNo} (${ad}): geçersiz ödeme durumu "${odeme}"`); continue; }
    if (bit < bas) { uyarilar.push(`satır ${satirNo} (${ad}): bitiş tarihi başlangıçtan önce`); continue; }
    const bedel = sayi(r["Sözleşme Bedeli (TL)"]) ?? 0;
    const not = metin(r["Not"]);
    sozlesmeEkle.push(
      `insert into contracts (school_id, created_by, start_date, end_date, contract_value, ` +
      `expected_teacher_count, status, payment_status${not ? ", notes" : ""})\n` +
      `  values (${q(id)}, ${KAYIT_SAHIBI}, ${q(bas)}, ${q(bit)}, ${bedel}, ` +
      `${bekl ?? "null"}, ${q(durum)}, ${q(odeme)}${not ? `, ${q(not)}` : ""});  -- ${ad}`
    );
  } else if (bas || bit) {
    uyarilar.push(`satır ${satirNo} (${ad}): sözleşme tarihlerinden yalnız biri dolu — yazılmadı` +
      (bas && !varsayilanBitis ? ` (--bitis ile ortak bir bitiş tarihi verebilirsiniz)` : ""));
  } else if (bekl !== null) {
    uyarilar.push(`satır ${satirNo} (${ad}): beklenen öğretmen yazıldı ama sözleşme tarihleri boş. ` +
                  `Bu alan sözleşmede tutuluyor, sözleşme olmadan kaydedilemez.`);
  }
}

// --- koordinatörler (kişisel veri) ---
const koordinator = [];
for (const [i, r] of sayfa("Koordinatörler").entries()) {
  const satirNo = i + 2;
  const id = metin(r["okul_id (DEĞİŞTİRMEYİN)"]);
  const ad = metin(r["Ad Soyad"]);
  if (!id || !ad) continue;
  const okul = metin(r["Okul Adı (DEĞİŞTİRMEYİN)"]);
  const eposta = metin(r["E-posta"]), tel = metin(r["Telefon"]), unvan = metin(r["Ünvan"]);
  if (!eposta) { uyarilar.push(`Koordinatörler satır ${satirNo} (${okul}): e-posta boş — kimlik olarak gerekli, atlandı`); continue; }
  koordinator.push(
    `with y as (\n` +
    `  insert into contacts (full_name, email, phone, title, contact_type, linked_school_id)\n` +
    `  values (${q(ad)}, ${q(eposta)}, ${tel ? q(tel) : "null"}, ${unvan ? q(unvan) : "null"}, 'okul_koordinatoru', ${q(id)})\n` +
    `  returning id\n` +
    `)\n` +
    `insert into coordinators (school_id, contact_id, is_primary) select ${q(id)}, id, true from y;  -- ${okul}`
  );
}

const parcalar = [];
parcalar.push(`-- Okul profil verisi — ${basename(dosya)} dosyasından üretildi`);
parcalar.push(`-- Üretim: ${new Date().toISOString().slice(0, 10)}`);
parcalar.push(`--`);
parcalar.push(`-- Tamamı TEK TRANSACTION. Bir satır patlarsa hiçbiri yazılmaz.`);
parcalar.push(`-- Boş bırakılan alanlar yazılmaz; mevcut değerlerin üzerine boş geçilmez.`);
if (varsayilanBitis) {
  parcalar.push(`-- Bitişi boş bırakılan sözleşmelere ortak bitiş tarihi: ${varsayilanBitis}`);
}
parcalar.push(``);
parcalar.push(`begin;`);
parcalar.push(``);

if (okulGuncelle.length) {
  parcalar.push(`-- ${okulGuncelle.length} okulun konumu`);
  parcalar.push(...okulGuncelle, ``);
}
if (okulDurumu.length) {
  parcalar.push(`-- ${okulDurumu.length} okulun durumu`);
  parcalar.push(...okulDurumu, ``);
}
if (sozlesmeGuncelle.length) {
  parcalar.push(`-- ${sozlesmeGuncelle.length} mevcut sözleşmede beklenen öğretmen sayısı`);
  parcalar.push(...sozlesmeGuncelle, ``);
}
if (sozlesmeEkle.length) {
  parcalar.push(`-- ${sozlesmeEkle.length} sözleşme`);
  parcalar.push(...sozlesmeEkle, ``);
}
if (koordinator.length) {
  parcalar.push(`-- ${koordinator.length} koordinatör (KİŞİSEL VERİ)`);
  parcalar.push(...koordinator, ``);
}
parcalar.push(`commit;`);

const ciktiYolu = join(dirname(dosya), basename(dosya).replace(/\.xlsx?$/i, "") + ".sql");
writeFileSync(ciktiYolu, parcalar.join("\n") + "\n", "utf8");

console.log(`\n  Konum güncelleme: ${okulGuncelle.length}`);
console.log(`  Durum güncelleme: ${okulDurumu.length}`);
console.log(`  Sözleşme (yeni) : ${sozlesmeEkle.length}`);
console.log(`  Sözleşme (günc.): ${sozlesmeGuncelle.length}`);
console.log(`  Koordinatör     : ${koordinator.length}`);
if (uyarilar.length) {
  console.log(`\n  --- atlanan satırlar (${uyarilar.length}) ---`);
  for (const u of uyarilar) console.log(`    ${u}`);
}
console.log(`\n  → ${ciktiYolu}`);
console.log(`    Supabase → SQL Editor'de çalıştırın.\n`);
