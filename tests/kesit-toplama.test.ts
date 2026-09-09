/**
 * TÜMÜ toplaması — kurumları tek bir toplam "kuruma" indirgemenin kuralları.
 *
 * Bu kurallar sessizce bozulabilir: yanlış toplama hata vermez, sadece
 * yanlış sayı üretir. Kuruma gönderilen PDF'te de o sayı görünür.
 */
import { describe, it, expect } from "vitest";
import { kurumlariBirlestir, TUMU_ADI, type KesitKurum, type KesitEgitim } from "@/components/reports/kesit";

const E = (egitimAdi: string, atanan: number, tamamlayan: number, hic = 0, sert = 0): KesitEgitim => ({
  egitimAdi, atananOgretmen: atanan, tamamlayan,
  tamamlanmaOrani: atanan ? (tamamlayan / atanan) * 100 : 0,
  hicBaslamayan: hic, sertifikaSayisi: sert,
});

const K = (
  kurumAdi: string, ogretmen: number, ilerleme: number, tamamlanma: number,
  sertifika: number | null = 0, egitimler: KesitEgitim[] = [],
): KesitKurum => ({
  kaynak: "detayli", kurumAdi, ogretmenSayisi: ogretmen, subeSayisi: 2,
  egitimSayisi: egitimler.length || null, kayitSayisi: ogretmen * 3,
  ilerlemeOrtalamasi: ilerleme, tamamlanmaOrani: tamamlanma, tamamlananEgitim: 5,
  sertifikaSayisi: sertifika, sertifikaAlan: sertifika,
  hicBaslamayan: 2, devamEden: 1, tumunuTamamlayan: 1, esitsizAtama: 0,
  subeler: [], egitimler,
  sertifikaAylik: [{ ay: "2026-05", adet: 1 }, { ay: "2026-06", adet: 2 }],
});

describe("kurumlariBirlestir — ağırlıklandırma", () => {
  // 100 öğretmenli %50 + 10 öğretmenli %90 → (5000+900)/110
  const t = kurumlariBirlestir([K("X", 100, 50, 40, 10), K("Y", 10, 90, 80, 9)])!;

  it("ortalamayı öğretmen sayısıyla ağırlıklandırır", () => {
    expect(t.ilerlemeOrtalamasi).toBeCloseTo(5900 / 110, 5);
  });

  it("kurum ortalamalarının düz ortalamasını ALMAZ", () => {
    // Düz ortalama %70 verirdi — 12 öğretmenli kurum 940 öğretmenliyle eşit sayılırdı
    expect(t.ilerlemeOrtalamasi).not.toBeCloseTo(70, 1);
  });

  it("tamamlanma oranını da ağırlıklandırır", () => {
    expect(t.tamamlanmaOrani).toBeCloseTo((100 * 40 + 10 * 80) / 110, 5);
  });

  it("sayıları toplar", () => {
    expect(t.ogretmenSayisi).toBe(110);
    expect(t.sertifikaSayisi).toBe(19);
  });

  it("toplam satırını TUMU_ADI ile adlandırır", () => {
    expect(t.kurumAdi).toBe(TUMU_ADI);
  });
});

describe("kurumlariBirlestir — eğitimler", () => {
  const t = kurumlariBirlestir([
    K("X", 100, 50, 40, 10, [E("Eğitim A", 100, 50), E("Eğitim B", 100, 30), E("Eğitim C", 100, 10)]),
    K("Y", 10, 90, 80, 9, [E("Eğitim A", 10, 9), E("Eğitim B", 10, 8), E("Eğitim D", 10, 7)]),
  ])!;

  it("eğitim sayısını TOPLAMAZ, birleşimini alır", () => {
    // Aynı eğitim birçok kuruma atanıyor; toplamak katlardı (3+3=6 yerine 4)
    expect(t.egitimSayisi).toBe(4);
  });

  it("aynı eğitimin ham sayılarını toplar", () => {
    const a = t.egitimler.find((e) => e.egitimAdi === "Eğitim A")!;
    expect(a.atananOgretmen).toBe(110);
    expect(a.tamamlayan).toBe(59);
  });

  it("oranı ham sayıdan yeniden hesaplar, oranların ortalamasını almaz", () => {
    const a = t.egitimler.find((e) => e.egitimAdi === "Eğitim A")!;
    expect(a.tamamlanmaOrani).toBeCloseTo((59 / 110) * 100, 5);
    expect(a.tamamlanmaOrani).not.toBeCloseTo(70, 1); // (%50+%90)/2
  });

  it("en düşük oranı üste koyar", () => {
    const oranlar = t.egitimler.map((e) => e.tamamlanmaOrani);
    expect(oranlar).toEqual([...oranlar].sort((a, b) => a - b));
  });
});

describe("kurumlariBirlestir — bilinmeyen değer", () => {
  it("bir kurum bile bilmiyorsa toplam da bilinmez", () => {
    // Kısmi toplam "sertifika düştü" gibi okunurdu
    const t = kurumlariBirlestir([K("X", 100, 50, 40, 10), K("Y", 10, 90, 80, null)])!;
    expect(t.sertifikaSayisi).toBeNull();
  });

  it("hepsi biliyorsa toplar", () => {
    const t = kurumlariBirlestir([K("X", 100, 50, 40, 10), K("Y", 10, 90, 80, 9)])!;
    expect(t.sertifikaSayisi).toBe(19);
  });
});

describe("kurumlariBirlestir — kırılım ve sınırlar", () => {
  it("şube alanında KURUM kırılımı taşır, ilerlemeye göre sıralı", () => {
    const t = kurumlariBirlestir([K("Düşük", 100, 20, 10), K("Yüksek", 10, 95, 90)])!;
    expect(t.subeler.map((s) => s.subeAdi)).toEqual(["Yüksek", "Düşük"]);
  });

  it("sertifika aylarını birleştirir", () => {
    const t = kurumlariBirlestir([K("X", 10, 50, 40), K("Y", 10, 50, 40)])!;
    expect(t.sertifikaAylik).toEqual([{ ay: "2026-05", adet: 2 }, { ay: "2026-06", adet: 4 }]);
  });

  it("boş listede null döner", () => {
    expect(kurumlariBirlestir([])).toBeNull();
  });

  it("tek kurumda o kurumun değerlerini korur", () => {
    const t = kurumlariBirlestir([K("Tek", 50, 33.3, 22.2)])!;
    expect(t.ilerlemeOrtalamasi).toBeCloseTo(33.3, 5);
    expect(t.ogretmenSayisi).toBe(50);
  });

  it("0 öğretmende sıfıra bölmez", () => {
    const t = kurumlariBirlestir([K("Sıfır", 0, 0, 0)])!;
    expect(t.ilerlemeOrtalamasi).toBe(0);
  });
});
