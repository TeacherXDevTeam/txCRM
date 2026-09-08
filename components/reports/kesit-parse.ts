"use client";

import * as XLSX from "xlsx";
import { norm, num } from "./parse-utils";
import type { HamSatir } from "./kesit";

type Alan = "eposta" | "kurum" | "sube" | "egitim" | "ilerleme" | "sertifika";

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
};

export const BEKLENEN_SUTUNLAR =
  "Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi";

export interface ParseSonucu {
  satirlar: HamSatir[];
  /** Verinin okunduğu sayfa adı */
  sayfa: string;
  kaynakSatir: number;
  olcekDuzeltildi: boolean;
  epostasiz: number;
}

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

const ZORUNLU: Alan[] = ["eposta", "kurum", "egitim", "ilerleme"];
const ALAN_ADI: Record<string, string> = {
  eposta: "E-posta", kurum: "Kurum", egitim: "Eğitim", ilerleme: "İlerleme (%)",
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
  const denenen: string[] = [];

  for (const ad of wb.SheetNames) {
    const ws = wb.Sheets[ad];
    if (!ws) continue;
    const satirlar = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (satirlar.length === 0) { denenen.push(`${ad} (boş)`); continue; }
    const e = basliklariEsle(satirlar);
    const bulunan = new Set(e.values());
    const eksik = ZORUNLU.filter((a) => !bulunan.has(a));
    if (eksik.length === 0) { raw = satirlar; eslesme = e; bulunanSayfa = ad; break; }
    denenen.push(`${ad} (eksik: ${eksik.map((a) => ALAN_ADI[a]).join(", ")})`);
  }

  if (!bulunanSayfa) {
    throw new Error(
      `Gerekli sütunları taşıyan sayfa bulunamadı. Beklenen: ${BEKLENEN_SUTUNLAR}. ` +
      `Bakılan sayfalar → ${denenen.join(" · ")}`
    );
  }

  let epostasiz = 0;
  const satirlar: HamSatir[] = [];
  for (const r of raw) {
    let eposta = "", kurum = "", sube = "", egitim = "", ilerleme = 0;
    let sertifikaTarihi: string | null = null;
    for (const [key, alan] of eslesme) {
      const v = r[key];
      if (alan === "ilerleme") ilerleme = num(v);
      else if (alan === "sertifika") sertifikaTarihi = tarihe(v);
      else if (alan === "eposta") eposta = String(v ?? "").trim();
      else if (alan === "kurum") kurum = String(v ?? "").trim();
      else if (alan === "sube") sube = String(v ?? "").trim();
      else if (alan === "egitim") egitim = String(v ?? "").trim();
    }
    if (!eposta) { epostasiz++; continue; }
    satirlar.push({ eposta, kurum, sube, egitim, ilerleme, sertifikaTarihi });
  }

  if (satirlar.length === 0) throw new Error("E-postası olan geçerli satır yok.");

  // Ölçek: dosya 0-100 veriyorsa 0-1'e indir. Belirsizse durdur.
  const enBuyuk = Math.max(...satirlar.map((s) => s.ilerleme), 0);
  let olcekDuzeltildi = false;
  if (enBuyuk > 1.5) {
    if (enBuyuk > 100.5) {
      throw new Error(`İlerleme sütununda beklenmeyen değer (en yüksek ${enBuyuk}). 0–1 ya da 0–100 aralığında olmalı.`);
    }
    satirlar.forEach((s) => (s.ilerleme = s.ilerleme / 100));
    olcekDuzeltildi = true;
  }
  satirlar.forEach((s) => (s.ilerleme = Math.min(1, Math.max(0, s.ilerleme))));

  return { satirlar, sayfa: bulunanSayfa, kaynakSatir: raw.length, olcekDuzeltildi, epostasiz };
}
