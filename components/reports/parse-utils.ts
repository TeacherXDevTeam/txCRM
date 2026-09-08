// Excel başlık/sayı ayrıştırma yardımcıları — hem kurs-bazlı hem öğretmen-özeti
// parser'ı bunları kullanır.

/** Türkçe karakterleri sadeleştirip başlığı eşleştirilebilir anahtara çevirir. */
export function norm(s: string) {
  return s.toString()
    .replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o").replace(/[Üü]/g, "u").replace(/[Ğğ]/g, "g")
    .toLowerCase().replace(/[^a-z0-9%]/g, "");
}

/** "45", "45,5", "%45", 45 → 45. Ayrıştırılamayan her şey 0. */
export function num(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(",", ".").replace("%", "").trim());
  return isNaN(n) ? 0 : n;
}

/** Tam sayı bekleyen alanlar için (kurs adedi vb.) — negatif değer 0'a çekilir. */
export function intNum(v: unknown): number {
  return Math.max(0, Math.round(num(v)));
}
