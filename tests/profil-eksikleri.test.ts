/**
 * Okul profil tamamlama kuralı.
 *
 * Kural önce sayfanın içinde satır arasındaydı ve "beklenen öğretmen"i
 * contracts.expected_teacher_count'tan okuyordu. Kaynak schools sütununa
 * taşındığında burası güncellenmeyi unuttu; 107 okulun hepsi "eksik"
 * görünüyordu. Kural artık tek yerde ve sınanıyor.
 */
import { describe, it, expect } from "vitest";
import { profilEksikleri, type ProfilOkulu } from "@/components/schools/profil-eksikleri";

const O = (id: string, name: string, beklenen: number | null = null, grup: string | null = null,
           status: string = "aktif"): ProfilOkulu =>
  ({ id, name, beklenen_ogretmen_sayisi: beklenen, beklenen_grup: grup, status });

const bos = new Set<string>();

describe("profilEksikleri — beklenen öğretmen kaynağı", () => {
  it("hedefi schools sütunundan okur", () => {
    const o = profilEksikleri([O("1", "A", 120)], bos, bos);
    expect(o.eksikler[0].missing).not.toContain("Beklenen öğretmen");
  });

  it("hedefi olmayan okulu eksik sayar", () => {
    const o = profilEksikleri([O("1", "A")], bos, bos);
    expect(o.eksikler[0].missing).toContain("Beklenen öğretmen");
    expect(o.sayilar["Beklenen öğretmen"]).toBe(1);
  });

  it("hedef 0 ise de girilmiş sayılır", () => {
    // 0 geçerli bir hedef; null'dan farklı. (Koordinatör/sözleşme ayrı eksikler.)
    const o = profilEksikleri([O("1", "A", 0)], new Set(["1"]), new Set(["1"]));
    expect(o.eksikler).toHaveLength(0);
    expect(o.sayilar["Beklenen öğretmen"]).toBe(0);
  });
});

describe("profilEksikleri — birleşik hedef grubu", () => {
  it("hedef grup liderinde ise üye de hedefli sayılır", () => {
    const o = profilEksikleri([O("1", "Lider", 200, "G"), O("2", "Üye", null, "G")],
      new Set(["1", "2"]), new Set(["1", "2"]));
    expect(o.eksikler).toHaveLength(0);
    expect(o.tamam).toBe(2);
  });

  it("hiçbir üyesinde hedef yoksa grubun tamamı eksik", () => {
    const o = profilEksikleri([O("1", "X", null, "H"), O("2", "Y", null, "H")], new Set(["1", "2"]), new Set(["1", "2"]));
    expect(o.sayilar["Beklenen öğretmen"]).toBe(2);
  });

  it("başka grubun hedefi bu gruba sayılmaz", () => {
    const o = profilEksikleri([O("1", "A", 100, "G1"), O("2", "B", null, "G2")], new Set(["1", "2"]), new Set(["1", "2"]));
    expect(o.eksikler.map((e) => e.name)).toEqual(["B"]);
  });
});

describe("profilEksikleri — koordinatör ve sözleşme", () => {
  it("üçü de varsa okul tamam", () => {
    const o = profilEksikleri([O("1", "A", 50)], new Set(["1"]), new Set(["1"]));
    expect(o.eksikler).toHaveLength(0);
    expect(o.tamam).toBe(1);
  });

  it("eksikleri tek tek sayar", () => {
    const o = profilEksikleri(
      [O("1", "Tam", 50), O("2", "Koordinatörsüz", 50), O("3", "Hiçbiri")],
      new Set(["1", "3"]), new Set(["1", "2"]),
    );
    expect(o.sayilar).toEqual({ "Koordinatör": 1, "Sözleşme": 1, "Beklenen öğretmen": 1 });
    expect(o.eksikler.find((e) => e.name === "Hiçbiri")!.missing).toEqual(["Sözleşme", "Beklenen öğretmen"]);
    expect(o.tamam).toBe(1);
  });

  it("konumu şart koşmaz", () => {
    // Konum bilerek kapsam dışı — kalıcı açık rozet asıl eksikleri gizliyordu
    const o = profilEksikleri([O("1", "Konumsuz", 50)], new Set(["1"]), new Set(["1"]));
    expect(o.eksikler).toHaveLength(0);
  });

  it("boş listede sıfır", () => {
    const o = profilEksikleri([], bos, bos);
    expect(o).toMatchObject({ eksikler: [], tamam: 0 });
  });
});

describe("profilEksikleri — pasif okullar kapsam dışı", () => {
  it("pasif okulu kuyruğa almaz ve toplamdan düşer", () => {
    // Artık çalışılmayan kurumun eksiklerini kovalamak gürültü
    const o = profilEksikleri(
      [O("1", "Aktif eksik"), O("2", "Pasif eksik", null, null, "pasif")],
      bos, bos,
    );
    expect(o.eksikler.map((e) => e.name)).toEqual(["Aktif eksik"]);
    expect(o.toplam).toBe(1);
    expect(o.kapsamDisi).toBe(1);
    expect(o.sayilar["Sözleşme"]).toBe(1);
  });

  it("potansiyel okul kapsamda kalır", () => {
    const o = profilEksikleri([O("1", "Potansiyel", null, null, "potansiyel")], bos, bos);
    expect(o.toplam).toBe(1);
    expect(o.kapsamDisi).toBe(0);
  });

  it("hepsi pasifse kuyruk boş, yüzde bölmesi patlamaz", () => {
    const o = profilEksikleri([O("1", "A", null, null, "pasif")], bos, bos);
    expect(o).toMatchObject({ eksikler: [], tamam: 0, toplam: 0, kapsamDisi: 1 });
  });

  it("hedef pasif grup liderindeyse aktif üye hedefsiz sayılmaz", () => {
    const o = profilEksikleri(
      [O("1", "Pasif lider", 200, "G", "pasif"), O("2", "Aktif üye", null, "G")],
      new Set(["2"]), new Set(["2"]),
    );
    expect(o.eksikler).toHaveLength(0);
    expect(o.toplam).toBe(1);
  });
});
