/**
 * Excel ayrıştırma — format algılama ve doğrulama.
 *
 * Buradaki hatalar en pahalısı: yanlış formatı kabul etmek hata vermez,
 * sessizce yanlış sayı üretir. Gerçekten oldu: öğretmen özeti dosyası
 * kurs bazlı sanılıp ortalama %54 yerine %20 çıkmıştı.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { excelOku } from "@/components/reports/kesit-parse";

function dosya(satirlar: Record<string, unknown>[], sayfaAdi = "Sheet1"): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), sayfaAdi);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

const DETAYLI = [
  { "Ad": "A", "Soyad": "B", "E-posta": "a@x.com", "Kurum": "GEN", "Şube": "M",
    "Eğitim": "E1", "İlerleme (%)": 0.5, "Sertifika Tarihi": "" },
];
const OZET = [
  { "Adı Soyadı": "A B", "E-posta": "a@x.com", "Kurum": "GEN", "Şube": "M",
    "Tamamlanan": 2, "Devam Eden": 1, "Tamamlama %": 0.5 },
];

describe("excelOku — format algılama", () => {
  it("detaylı dökümü tanır", () => {
    const s = excelOku(dosya(DETAYLI));
    expect(s.tip).toBe("detayli");
    expect(s.kaynakSatir).toBe(1);
  });

  it("özet dökümü tanır", () => {
    const s = excelOku(dosya(OZET));
    expect(s.tip).toBe("ozet");
  });

  it("gerekli sütunlar yoksa AÇIKÇA reddeder", () => {
    // Sessizce boş dönmek yerine hata: yanlış dosya fark edilsin
    expect(() => excelOku(dosya([{ "Adı Soyadı": "A", "Şube": "M" }])))
      .toThrow(/Gerekli sütunları taşıyan sayfa bulunamadı/);
  });

  it("veriyi ilk sayfada değil, DOĞRU sayfada arar", () => {
    // Kullanıcının panosunda ham veri 9. sayfadaydı
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Özet: "alakasız" }]), "Kapak");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DETAYLI), "Ham Veri");
    const s = excelOku(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    expect(s.tip).toBe("detayli");
    expect(s.sayfa).toBe("Ham Veri");
  });
});

describe("excelOku — ölçek doğrulama", () => {
  it("0–100 ölçeğini algılayıp düzeltir", () => {
    const s = excelOku(dosya([{ ...DETAYLI[0], "İlerleme (%)": 50 }]));
    expect(s.olcekDuzeltildi).toBe(true);
  });

  it("0–1 ölçeğinde düzeltme yapmaz", () => {
    expect(excelOku(dosya(DETAYLI)).olcekDuzeltildi).toBe(false);
  });

  it("anlamsız ölçekte durur", () => {
    // Belirsiz veriyle devam etmek sessiz yanlış sayı üretirdi
    expect(() => excelOku(dosya([{ ...DETAYLI[0], "İlerleme (%)": 5000 }])))
      .toThrow(/beklenmeyen değer/);
  });
});

describe("excelOku — gizlilik", () => {
  it("ad ve soyadı hiç okumaz", () => {
    const s = excelOku(dosya(DETAYLI));
    expect(JSON.stringify(s.satirlar)).not.toContain("A");
    expect(Object.keys(s.satirlar[0])).not.toContain("ad");
    expect(Object.keys(s.satirlar[0])).not.toContain("soyad");
  });

  it("e-postası olmayan satırı sayar ve dışarıda bırakır", () => {
    const s = excelOku(dosya([DETAYLI[0], { ...DETAYLI[0], "E-posta": "" }]));
    expect(s.satirlar).toHaveLength(1);
    expect(s.epostasiz).toBe(1);
  });
});
