/**
 * Aylık Takip — zaman serisi kuralları.
 *
 * Sabit sepet burada kritik: kurum listesi dönemler arasında değişiyor ve
 * değişken sepette "iki kurum da ilerlerken toplam düştü" gibi yanlış bir
 * sonuç çıkabiliyor.
 */
import { describe, it, expect } from "vitest";
import {
  trendKur, metrikDegeri, kisaAy, gunNumarasi, zamanKonumlari,
  egitimYili, egitimYiliBaslangici, egitimYiliSinirlari,
} from "@/components/reports/kesit-trend";
import type { Database } from "@/types/database";

type KurumRow = Database["public"]["Tables"]["report_kurum"]["Row"];

const K = (kesit_id: string, kurum_adi: string, school_id: string | null,
           o: number, ilerleme: number, sertifika: number | null = 1): KurumRow => ({
  id: kesit_id + kurum_adi, kesit_id, kurum_adi, school_id, kaynak: "detayli",
  ogretmen_sayisi: o, sube_sayisi: 1, egitim_sayisi: 3, kayit_sayisi: o * 3,
  ilerleme_ortalamasi: ilerleme, tamamlanma_orani: Math.max(0, ilerleme - 8),
  tamamlanan_egitim: 1, sertifika_sayisi: sertifika, sertifika_alan: sertifika,
  hic_baslamayan: 0, devam_eden: 0, tumunu_tamamlayan: 0, esitsiz_atama: 0,
  created_at: "2026-01-01",
});

const KESITLER = [
  { id: "kB", kesit_tarihi: "2026-02-01" },
  { id: "kA", kesit_tarihi: "2026-01-01" },
];

describe("trendKur — sepet", () => {
  // A: X(100 öğr %50) Y(10 öğr %90) · B: aynı ikisi ilerledi + Z yeni katıldı %0
  const t = trendKur(KESITLER, [
    K("kA", "X", "sx", 100, 50), K("kA", "Y", "sy", 10, 90),
    K("kB", "X", "sx", 100, 60), K("kB", "Y", "sy", 10, 100), K("kB", "Z", "sz", 50, 0),
  ]);

  it("kesitleri eskiden yeniye sıralar", () => {
    expect(t.kesitler.map((k) => k.tarih)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("sabit sepete yalnız her kesitte ölçülen kurumları alır", () => {
    expect(t.sabitKurumSayisi).toBe(2);
  });

  it("DEĞİŞKEN sepette yeni kurum toplamı aşağı çeker", () => {
    const a = metrikDegeri(t.toplam[0], "ilerlemeOrtalamasi")!;
    const b = metrikDegeri(t.toplam[1], "ilerlemeOrtalamasi")!;
    expect(a).toBeCloseTo(5900 / 110, 5);   // %53,6
    expect(b).toBeCloseTo(43.75, 5);        // %43,8 — DÜŞÜŞ
    expect(b).toBeLessThan(a);
  });

  it("SABİT sepette gerçek ilerleme görünür", () => {
    const a = metrikDegeri(t.toplamSabit[0], "ilerlemeOrtalamasi")!;
    const b = metrikDegeri(t.toplamSabit[1], "ilerlemeOrtalamasi")!;
    expect(b).toBeCloseTo(7000 / 110, 5);   // %63,6 — ARTIŞ
    expect(b).toBeGreaterThan(a);
  });
});

describe("trendKur — bilinmeyen ve eksik", () => {
  it("bir kurum sertifikayı bilmiyorsa toplam da bilmez", () => {
    const t = trendKur(KESITLER, [
      K("kA", "X", "sx", 100, 50, 10), K("kA", "Y", "sy", 10, 90, null),
    ]);
    expect(metrikDegeri(t.toplam[0], "sertifikaSayisi")).toBeNull();
  });

  it("kesitte olmayan kurum için null verir, 0 değil", () => {
    const t = trendKur(KESITLER, [K("kB", "Z", "sz", 50, 10)]);
    expect(t.kurumlar[0].hucreler[0]).toBeNull();
    expect(metrikDegeri(t.kurumlar[0].hucreler[0], "ilerlemeOrtalamasi")).toBeNull();
    expect(t.kurumlar[0].tamSeri).toBe(false);
  });

  it("kurum adı değişse de school_id serisi korur, ad en son kesitten gelir", () => {
    const t = trendKur(KESITLER, [
      K("kB", "Özel GEN Koleji", "s1", 10, 60),   // yeni kesit, dizide ÖNCE
      K("kA", "GEN Kolej", "s1", 10, 50),
    ]);
    expect(t.kurumlar).toHaveLength(1);
    expect(t.kurumlar[0].kurumAdi).toBe("Özel GEN Koleji");
  });

  it("çekilmemiş kesitin satırını atlar", () => {
    const t = trendKur([{ id: "kA", kesit_tarihi: "2026-01-01" }], [
      K("kA", "X", "sx", 10, 50), K("ESKI", "X", "sx", 10, 99),
    ]);
    expect(metrikDegeri(t.kurumlar[0].hucreler[0], "ilerlemeOrtalamasi")).toBe(50);
  });
});

describe("numeric sütunlar", () => {
  it("metin gelirse de sayıya çevirir", () => {
    /*
     * types/database.ts bu sütunlar için `number` diyor ama kod her yerde
     * Number(...) ile sarıyor — biri yanlış. PostgREST'in numeric sütunları
     * metin döndürme ihtimaline karşı savunma doğru; burada o savunmanın
     * gerçekten çalıştığı sabitleniyor. Savunma kaldırılırsa bu test düşer.
     */
    const metinli = { ...K("kA", "X", "sx", 10, 0), ilerleme_ortalamasi: "42.5" } as unknown as KurumRow;
    const t = trendKur([{ id: "kA", kesit_tarihi: "2026-01-01" }], [metinli]);
    const v = metrikDegeri(t.kurumlar[0].hucreler[0], "ilerlemeOrtalamasi");
    expect(v).toBe(42.5);
    expect(typeof v).toBe("number");
  });
});

describe("zaman ekseni", () => {
  it("gün farkını saat diliminden bağımsız hesaplar", () => {
    expect(gunNumarasi("2026-01-01") - gunNumarasi("2025-01-01")).toBe(365);
    expect(gunNumarasi("2024-03-01") - gunNumarasi("2024-02-28")).toBe(2);
  });

  it("noktaları tarihe göre yerleştirir, sıraya göre değil", () => {
    // 2025-06-30 → 2026-09-09 = 436 gün, → 2026-10-09 = 30 gün daha
    const p = zamanKonumlari(["2025-06-30", "2026-09-09", "2026-10-09"]);
    expect(p[0]).toBeCloseTo(0, 5);
    expect(p[2]).toBeCloseTo(1, 5);
    expect(p[1]).toBeCloseTo(436 / 466, 5);
    expect(p[1]).not.toBeCloseTo(0.5, 1);   // eşit aralıklı olsaydı
  });

  it("tek kesiti ortalar, aynı tarihleri de", () => {
    expect(zamanKonumlari(["2026-09-09"])).toEqual([0.5]);
    expect(zamanKonumlari(["2026-09-09", "2026-09-09"])).toEqual([0.5, 0.5]);
  });

  it("kısa ay etiketi saat diliminden bağımsız", () => {
    expect(kisaAy("2026-09-09")).toBe("09.26");
    expect(kisaAy("2025-12-31")).toBe("12.25");
  });
});

describe("eğitim öğretim yılı — Ağustos'ta başlar", () => {
  it("temmuz önceki yıla aittir", () => {
    expect(egitimYili("2026-07-31")).toBe("2025-26");
    expect(egitimYili("2026-08-01")).toBe("2026-27");
  });

  it("kullanıcının kapanış dosyası ile güncel kesit farklı yıllarda", () => {
    expect(egitimYili("2026-07-13")).toBe("2025-26");
    expect(egitimYili("2026-09-09")).toBe("2026-27");
  });

  it("yüzyıl ve basamak dolgusu", () => {
    expect(egitimYili("2099-08-01")).toBe("2099-00");
    expect(egitimYili("2009-09-01")).toBe("2009-10");
    expect(egitimYiliBaslangici("2025-26")).toBe("2025-08-01");
  });

  it("aralıktaki yıl sınırlarını verir", () => {
    const s = egitimYiliSinirlari(["2025-06-30", "2026-10-09"]);
    expect(s.map((x) => x.etiket)).toEqual(["2025-26", "2026-27"]);
    expect(s.every((x) => x.tarih.endsWith("-08-01"))).toBe(true);
  });

  it("aynı yıl içinde ve uç noktada ayraç çizmez", () => {
    expect(egitimYiliSinirlari(["2026-06-01", "2026-07-01"])).toHaveLength(0);
    expect(egitimYiliSinirlari(["2025-08-01", "2026-01-01"])).toHaveLength(0);
    expect(egitimYiliSinirlari(["2026-09-09"])).toHaveLength(0);
  });
});
