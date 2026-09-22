/**
 * Beklenen öğretmen kontrolü — tek kaynak.
 *
 * Bu hesap önce iki yerde yazılmıştı ve farklı sonuç veriyordu: karşılaştırma
 * tablosunun alt satırı üç sütunu üç ayrı kurum kümesinden topluyordu ve
 * gruplu okulların sapması toplamda hiç görünmüyordu.
 */
import { describe, it, expect } from "vitest";
import {
  sapmaHesapla, kurumSapmasi, bilinirseTopla, type KesitKurum,
} from "@/components/reports/kesit";

const K = (
  kurumAdi: string, ogretmen: number,
  beklenen: number | null = null, grup: string | null = null,
  sertifika: number | null = 0,
): KesitKurum => ({
  kaynak: "detayli", kurumAdi, ogretmenSayisi: ogretmen, subeSayisi: 1,
  egitimSayisi: 1, kayitSayisi: ogretmen, ilerlemeOrtalamasi: 50, tamamlanmaOrani: 40,
  tamamlananEgitim: 1, sertifikaSayisi: sertifika, sertifikaAlan: sertifika,
  hicBaslamayan: 0, devamEden: 0, tumunuTamamlayan: 0, esitsizAtama: 0,
  subeler: [], egitimler: [], sertifikaAylik: [],
  beklenenOgretmen: beklenen, beklenenGrup: grup,
});

// Hata raporundaki örnek, birebir
const ORNEK = [
  K("A (bireysel)", 90, 100),
  K("B (grup lideri)", 150, 200, "G"),
  K("C (grup üyesi)", 60, null, "G"),
  K("D (hedefsiz)", 40),
];

describe("sapmaHesapla — hata raporundaki örnek", () => {
  const o = sapmaHesapla(ORNEK);

  it("gruplu okulların sapmasını toplama katar", () => {
    // Eskiden tablo toplamı yalnız A'yı görüyordu: −10
    expect(o.toplam.fark).toBe(0);           // A −10 + G +10
    expect(o.birimler.map((b) => b.ad).sort()).toEqual(["A (bireysel)", "G"]);
  });

  it("beklenen ve gerçek AYNI küme üzerinden toplanır", () => {
    expect(o.toplam.beklenen).toBe(300);     // 100 + 200
    expect(o.toplam.gercek).toBe(300);       // 90 + (150 + 60)
    expect(o.toplam.fark).toBe(o.toplam.gercek - o.toplam.beklenen);
  });

  it("hedefsiz kurumu kontrol dışı sayar ve bildirir", () => {
    expect(o.hedefsizKurum).toBe(1);
    expect(o.birimler.find((b) => b.ad.startsWith("D"))).toBeUndefined();
  });

  it("grup birimini üye toplamıyla kurar", () => {
    const g = o.birimler.find((b) => b.grup)!;
    expect(g).toMatchObject({ ad: "G", beklenen: 200, gercek: 210, fark: 10, kurumSayisi: 2 });
  });
});

describe("sapmaHesapla — sapma listesi", () => {
  it("farkı 0 olanı listeye koymaz ama birim olarak sayar", () => {
    const o = sapmaHesapla([K("Tam", 50, 50), K("Eksik", 40, 50)]);
    expect(o.birimler).toHaveLength(2);
    expect(o.sapmalar.map((s) => s.ad)).toEqual(["Eksik"]);
  });

  it("mutlak farka göre büyükten küçüğe sıralar", () => {
    const o = sapmaHesapla([K("Az", 48, 50), K("Çok eksik", 10, 50), K("Çok fazla", 80, 50)]);
    expect(o.sapmalar.map((s) => s.ad)).toEqual(["Çok eksik", "Çok fazla", "Az"]);
  });

  it("hedefi 0 olan grubu kontrol dışı bırakır", () => {
    const o = sapmaHesapla([K("X", 30, null, "H"), K("Y", 20, null, "H")]);
    expect(o.birimler).toHaveLength(0);
    expect(o.hedefsizKurum).toBe(2);
  });

  it("hedefi birden çok üyeye dağılmış grubu toplar", () => {
    const o = sapmaHesapla([K("X", 30, 25, "H"), K("Y", 20, 25, "H")]);
    expect(o.birimler[0]).toMatchObject({ beklenen: 50, gercek: 50, fark: 0 });
  });

  it("boş listede sıfır birim döner", () => {
    const o = sapmaHesapla([]);
    expect(o.birimler).toHaveLength(0);
    expect(o.toplam).toEqual({ beklenen: 0, gercek: 0, fark: 0 });
  });
});

describe("kurumSapmasi — tablo satırı", () => {
  it("grupsuz, hedefli kurumda farkı verir", () => {
    expect(kurumSapmasi(K("A", 90, 100))).toBe(-10);
  });

  it("gruplu kurumda null — grubuyla birlikte kontrol edilir", () => {
    expect(kurumSapmasi(K("B", 150, 200, "G"))).toBeNull();
  });

  it("hedefsiz kurumda null", () => {
    expect(kurumSapmasi(K("D", 40))).toBeNull();
  });
});

describe("bilinirseTopla", () => {
  it("hepsi biliniyorsa toplar", () => {
    expect(bilinirseTopla([K("X", 1, null, null, 3), K("Y", 1, null, null, 4)], (k) => k.sertifikaSayisi)).toBe(7);
  });

  it("biri bile bilinmiyorsa null — 0 değil", () => {
    // Özet dökümde sertifika yok; alt satır "0" değil "—" göstermeli
    expect(bilinirseTopla([K("X", 1, null, null, 3), K("Y", 1, null, null, null)], (k) => k.sertifikaSayisi)).toBeNull();
  });
});
