"use client";

import * as XLSX from "xlsx";
import { norm, num } from "./parse-utils";
import type { HamSatir, OzetSatir, KesitKaynagi } from "./kesit";

type Alan = "eposta" | "kurum" | "sube" | "egitim" | "ilerleme" | "sertifika"
          | "tamamlanan" | "devam";

// Ad/Soyad bilerek eşlenmiyor — kesit çıktısına girmediği için okunmasına da gerek yok.
const MAP: Record<string, Alan> = {
  eposta: "eposta", email: "eposta", mail: "eposta", epostaadresi: "eposta",
  kurum: "kurum", kurumadi: "kurum", okul: "kurum", okuladi: "kurum",
  sube: "sube", subeadi: "sube", kampus: "sube",
  egitim: "egitim", egitimadi: "egitim", kurs: "egitim", kursadi: "egitim",
  "ilerleme%": "ilerleme", ilerleme: "ilerleme", ilerlemeyuzdesi: "ilerleme",
  "tamamlama%": "ilerleme", tamamlamayuzdesi: "ilerleme",
  sertifikatarihi: "sertifika", sertifika: "sertifika",
  sertifikaninalindigitarih: "sertifika",
  // Özet dökümün ayırt edici sütunları
  tamamlanan: "tamamlanan", tamamlanankurs: "tamamlanan", tamamlananegitim: "tamamlanan",
  tamamlanankurssayisi: "tamamlanan", bitirilen: "tamamlanan",
  devameden: "devam", devamedenkurs: "devam", devamedenegitim: "devam",
  devamedenkurssayisi: "devam", devam: "devam",
};

export const SUTUNLAR_DETAYLI =
  "Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi";
export const SUTUNLAR_OZET =
  "Adı Soyadı · E-posta · Kurum · Şube · Tamamlanan · Devam Eden · Tamamlama %";

interface OrtakSonuc {
  /** Verinin okunduğu sayfa adı */
  sayfa: string;
  kaynakSatir: number;
  olcekDuzeltildi: boolean;
  epostasiz: number;
}
export type ParseSonucu =
  | (OrtakSonuc & { tip: "detayli"; satirlar: HamSatir[] })
  | (OrtakSonuc & { tip: "ozet"; satirlar: OzetSatir[] });

function tarihe(v: unknown): string | null {
  if (v instanceof Date) {
    // Yerel saatte biçimle — toISOString UTC'ye kaydırıp günü değiştirebilir
    const y = v.getFullYear(), a = v.getMonth() + 1, g = v.getDate();
    return `${y}-${String(a).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
  }
  const s = String(v ?? "").trim();
  if (!s || s === "0") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : tarihe(d);
}

/** Her formatın olmazsa olmaz sütunları. */
const ZORUNLU: Record<KesitKaynagi, Alan[]> = {
  detayli: ["eposta", "kurum", "egitim", "ilerleme"],
  ozet:    ["eposta", "kurum", "tamamlanan", "devam"],
};
const ALAN_ADI: Record<string, string> = {
  eposta: "E-posta", kurum: "Kurum", egitim: "Eğitim", ilerleme: "İlerleme (%)",
  tamamlanan: "Tamamlanan", devam: "Devam Eden",
};

/** Bir sayfanın başlıklarını alanlara eşler. */
function basliklariEsle(raw: Record<string, unknown>[]): Map<string, Alan> {
  const eslesme = new Map<string, Alan>();
  if (raw.length === 0) return eslesme;
  for (const key of Object.keys(raw[0])) {
    const a = MAP[norm(key)];
    if (a) eslesme.set(key, a);
  }
  return eslesme;
}

/**
 * Excel dosyasını ham satırlara çevirir. Hata durumunda mesajla fırlatır.
 *
 * Gerekli sütunları taşıyan sayfa aranır — dosyanın ilk sayfası kılavuz,
 * pano ya da başka bir şey olabilir (TeacherX takip panosunda "Ham Veri"
 * dokuzuncu sayfada).
 */
export function excelOku(buf: ArrayBuffer): ParseSonucu {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  if (wb.SheetNames.length === 0) throw new Error("Dosyada okunabilir sayfa yok.");

  let raw: Record<string, unknown>[] = [];
  let eslesme = new Map<string, Alan>();
  let bulunanSayfa = "";
  let tip: KesitKaynagi | null = null;
  const denenen: string[] = [];

  for (const ad of wb.SheetNames) {
    const ws = wb.Sheets[ad];
    if (!ws) continue;
    const satirlar = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (satirlar.length === 0) { denenen.push(`${ad} (boş)`); continue; }
    const e = basliklariEsle(satirlar);
    const bulunan = new Set(e.values());

    // Detaylı döküm önceliklidir — daha zengin
    for (const aday of ["detayli", "ozet"] as KesitKaynagi[]) {
      if (ZORUNLU[aday].every((a) => bulunan.has(a))) {
        raw = satirlar; eslesme = e; bulunanSayfa = ad; tip = aday;
        break;
      }
    }
    if (tip) break;

    const eksik = ZORUNLU.detayli.filter((a) => !bulunan.has(a));
    denenen.push(`${ad} (eksik: ${eksik.map((a) => ALAN_ADI[a]).join(", ")})`);
  }

  if (!tip) {
    throw new Error(
      "Gerekli sütunları taşıyan sayfa bulunamadı. Beklenen şu iki formattan biri — " +
      `detaylı: ${SUTUNLAR_DETAYLI} · özet: ${SUTUNLAR_OZET}. ` +
      `Bakılan sayfalar → ${denenen.join(" · ")}`
    );
  }

  // Satırları oku
  let epostasiz = 0;
  const detayli: HamSatir[] = [];
  const ozet: OzetSatir[] = [];

  for (const r of raw) {
    let eposta = "", kurum = "", sube = "", egitim = "";
    let ilerleme = 0, tamamlanan = 0, devam = 0;
    let sertifikaTarihi: string | null = null;
    for (const [key, alan] of eslesme) {
      const v = r[key];
      if (alan === "ilerleme") ilerleme = num(v);
      else if (alan === "tamamlanan") tamamlanan = Math.max(0, Math.round(num(v)));
      else if (alan === "devam") devam = Math.max(0, Math.round(num(v)));
      else if (alan === "sertifika") sertifikaTarihi = tarihe(v);
      else if (alan === "eposta") eposta = String(v ?? "").trim();
      else if (alan === "kurum") kurum = String(v ?? "").trim();
      else if (alan === "sube") sube = String(v ?? "").trim();
      else if (alan === "egitim") egitim = String(v ?? "").trim();
    }
    if (!eposta) { epostasiz++; continue; }
    if (tip === "detayli") detayli.push({ eposta, kurum, sube, egitim, ilerleme, sertifikaTarihi });
    else ozet.push({ eposta, kurum, sube, tamamlanan, devamEden: devam, yuzde: ilerleme });
  }

  const satirSayisi = tip === "detayli" ? detayli.length : ozet.length;
  if (satirSayisi === 0) throw new Error("E-postası olan geçerli satır yok.");

  // İlerleme/yüzde ölçeği: 0-100 geldiyse 0-1'e indir, belirsizse durdur
  const hedef = tip === "detayli" ? detayli : ozet;
  const oku = (x: HamSatir | OzetSatir) => ("ilerleme" in x ? x.ilerleme : x.yuzde);
  const yaz = (x: HamSatir | OzetSatir, v: number) => {
    if ("ilerleme" in x) x.ilerleme = v; else x.yuzde = v;
  };
  const enBuyuk = Math.max(...hedef.map(oku), 0);
  let olcekDuzeltildi = false;
  if (enBuyuk > 1.5) {
    if (enBuyuk > 100.5) {
      throw new Error(`İlerleme/tamamlama sütununda beklenmeyen değer (en yüksek ${enBuyuk}). 0–1 ya da 0–100 aralığında olmalı.`);
    }
    hedef.forEach((x) => yaz(x, oku(x) / 100));
    olcekDuzeltildi = true;
  }
  hedef.forEach((x) => yaz(x, Math.min(1, Math.max(0, oku(x)))));

  const ortak = { sayfa: bulunanSayfa, kaynakSatir: raw.length, olcekDuzeltildi, epostasiz };
  return tip === "detayli"
    ? { tip: "detayli", satirlar: detayli, ...ortak }
    : { tip: "ozet", satirlar: ozet, ...ortak };
}
