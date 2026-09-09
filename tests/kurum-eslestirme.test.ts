/**
 * Kurum ↔ okul eşleştirme kuralları.
 *
 * Buradaki her kural gerçek bir kazadan doğdu: hatırlanmayan kararlar
 * mükerrer okul açtı, tek ortak kelimeyle eşleşme "BİLNET ÇAMLICA"yı
 * "Çamlıca İsabet Okulları"na bağladı, "Bağlama" kararı unutuldu.
 */
import { describe, it, expect } from "vitest";
import {
  kurumEslestir, kararlariHazirla, ilgiGerekenSayisi, eslesmeSupheliMi,
  type OkulAdayi,
} from "@/components/reports/kurum-eslestir";

const OKULLAR: OkulAdayi[] = [
  { id: "s-gen", name: "GEN Koleji" },
  { id: "s-alkev", name: "ALKEV Okulları" },
  { id: "s-mavi", name: "Mavi Deniz Eğitim Kurumları" },
];
const BOS = new Map<string, string[]>();

describe("kurumEslestir", () => {
  it("ayırt edici kelimeler aynıysa kesin eşleşir", () => {
    const s = kurumEslestir("ALKEV Özel Okulları", OKULLAR);
    expect(s.okul?.id).toBe("s-alkev");
    expect(s.guven).toBe("kesin");
  });

  it("ortak kelimesi yoksa eşleştirmez", () => {
    // Bu gerçek bir vaka: ALKEV'e "Amerikan Kültür Kolejleri" bağlanmıştı;
    // eşleştirici masumdu, bağlantı elle kurulmuştu
    const s = kurumEslestir("Amerikan Kültür Kolejleri Genel Merkezi", OKULLAR);
    expect(s.okul).toBeNull();
    expect(s.guven).toBe("yok");
  });
});

describe("kararlariHazirla — hatırlanan kararlar", () => {
  it("elle verilen kararı bulanık eşleştirmenin üstüne koyar", () => {
    // Kullanıcı adı hiç benzemeyen bir okula bağlamış olabilir
    const h = kararlariHazirla(["Papatya Anaokulu"], OKULLAR, BOS, {
      "Papatya Anaokulu": { schoolId: "s-gen", tarih: "2026-08-01" },
    });
    expect(h.kararlar["Papatya Anaokulu"]).toEqual({ tip: "okul", schoolId: "s-gen" });
    expect(h.durumlar["Papatya Anaokulu"]).toBe("hatirlandi");
    expect(ilgiGerekenSayisi(h.durumlar)).toBe(0);
  });

  it("'Bağlama' kararını da hatırlar", () => {
    // Hatırlanmazsa "yeni okul olarak ekle" önerilir ve MÜKERRER okul açılır
    const h = kararlariHazirla(["Bilinmeyen Kurum"], OKULLAR, BOS, {
      "Bilinmeyen Kurum": { schoolId: null, tarih: "2026-08-01" },
    });
    expect(h.kararlar["Bilinmeyen Kurum"].tip).toBe("yok");
    expect(h.durumlar["Bilinmeyen Kurum"]).toBe("hatirlandi");
  });

  it("hatırlanan okul silinmişse kararı düşürür", () => {
    const h = kararlariHazirla(["Papatya Anaokulu"], OKULLAR, BOS, {
      "Papatya Anaokulu": { schoolId: "s-SILINMIS", tarih: "2026-08-01" },
    });
    expect(h.durumlar["Papatya Anaokulu"]).not.toBe("hatirlandi");
    expect(h.kararlar["Papatya Anaokulu"].tip).not.toBe("okul");
  });

  it("hiç görülmemiş kurumu bulanık eşleştirmeye bırakır", () => {
    const h = kararlariHazirla(["GEN Koleji", "Bambaşka Bir Yer"], OKULLAR, BOS, {});
    expect(h.durumlar["GEN Koleji"]).toBe("otomatik");
    expect(h.durumlar["Bambaşka Bir Yer"]).toBe("yeni");
    expect(ilgiGerekenSayisi(h.durumlar)).toBe(2);
  });

  it("yalnız yeni kurumu sorar", () => {
    const h = kararlariHazirla(["GEN Koleji", "Yepyeni Kurum"], OKULLAR, BOS, {
      "GEN Koleji": { schoolId: "s-gen", tarih: "2026-08-01" },
    });
    expect(ilgiGerekenSayisi(h.durumlar)).toBe(1);
  });
});

describe("eslesmeSupheliMi", () => {
  it("tek ortak kelimesi olmayan eşleşmeyi işaretler", () => {
    expect(eslesmeSupheliMi("Amerikan Kültür Kolejleri Genel Merkezi", "ALKEV")).toBe(true);
    expect(eslesmeSupheliMi("Papatya Anaokulu", "GEN Koleji")).toBe(true);
  });

  it("meşru farkları işaretlemez", () => {
    expect(eslesmeSupheliMi("ALKEV Okulları", "ALKEV")).toBe(false);
    expect(eslesmeSupheliMi("AÇI Okulları Tuzla", "AÇI Okulları")).toBe(false);
    expect(eslesmeSupheliMi("BİLNET Okulları İzmir", "BİLNET")).toBe(false);
  });

  it("boş adı şüpheli saymaz", () => {
    expect(eslesmeSupheliMi("", "ALKEV")).toBe(false);
  });
});
