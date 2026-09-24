/**
 * Okul profil tamamlama kuralı.
 *
 * Bu dosyada "use client" YOK: `okullar/page.tsx` bir Server Component.
 * Kural önce o sayfanın içinde satır arasında duruyordu; test edilemiyordu ve
 * "beklenen öğretmen" kaynağı değiştiğinde (contracts → schools) güncellenmesi
 * unutuldu. Tek yerde ve sınanabilir olması bu yüzden.
 */

export type EksikAlan = "Koordinatör" | "Sözleşme" | "Beklenen öğretmen";

export const EKSIK_ALANLAR: EksikAlan[] = ["Koordinatör", "Sözleşme", "Beklenen öğretmen"];

export interface ProfilOkulu {
  id: string;
  name: string;
  /** Ortaklık durumu — 'pasif' okullar kapsam dışıdır (bkz. profilEksikleri) */
  status?: string | null;
  /**
   * Sezon hedefi. `schools.beklenen_ogretmen_sayisi` — sözleşmede DEĞİL.
   * Birleşik hedef grubuna ait okullarda hedef grup liderinde durur;
   * grup üyesi kendi başına hedefsiz sayılmaz.
   */
  beklenen_ogretmen_sayisi?: number | null;
  beklenen_grup?: string | null;
}

export interface EksikOkul {
  id: string;
  name: string;
  missing: EksikAlan[];
}

export interface ProfilOzeti {
  eksikler: EksikOkul[];
  sayilar: Record<EksikAlan, number>;
  /** Kapsamdaki (pasif olmayan) okullardan profili tam olanlar */
  tamam: number;
  /** Kapsamdaki okul sayısı — yüzde bunun üzerinden */
  toplam: number;
  /** Pasif olduğu için hesaba girmeyen okul sayısı */
  kapsamDisi: number;
}

/**
 * PASİF OKULLAR KAPSAM DIŞI. Artık çalışılmayan bir kurumun koordinatörünü,
 * sözleşmesini ve hedefini kovalamak iş değil gürültü; kuyruğu şişirip asıl
 * eksikleri gizliyordu.
 *
 * Konum da bilerek şart değil: kural il VE ilçe istiyordu, rapordan gelen
 * kurumların çoğunda ilçe anlamlı bir bilgi değil ve rozet kalıcı açık
 * kalıyordu. Sürekli açık bir uyarı, bakılmayan bir uyarıdır.
 */
export function profilEksikleri(
  okullar: ProfilOkulu[],
  koordinatorluOkulIdleri: Set<string>,
  sozlesmeliOkulIdleri: Set<string>,
): ProfilOzeti {
  const kapsam = okullar.filter((o) => o.status !== "pasif");
  const kapsamDisi = okullar.length - kapsam.length;

  /*
   * Grup hedefi TÜM okullardan toplanır, yalnız kapsamdakilerden değil:
   * hedef pasif bir grup liderinde duruyorsa aktif üyeler hedefsiz
   * sayılmamalı.
   */
  const hedefliGruplar = new Set<string>();
  for (const o of okullar) {
    if (o.beklenen_grup && o.beklenen_ogretmen_sayisi != null) hedefliGruplar.add(o.beklenen_grup);
  }

  const eksikler: EksikOkul[] = [];
  const sayilar: Record<EksikAlan, number> = {
    "Koordinatör": 0, "Sözleşme": 0, "Beklenen öğretmen": 0,
  };

  for (const o of kapsam) {
    const missing: EksikAlan[] = [];
    if (!koordinatorluOkulIdleri.has(o.id)) missing.push("Koordinatör");
    if (!sozlesmeliOkulIdleri.has(o.id)) missing.push("Sözleşme");

    const hedefVar = o.beklenen_ogretmen_sayisi != null
      || (o.beklenen_grup != null && hedefliGruplar.has(o.beklenen_grup));
    if (!hedefVar) missing.push("Beklenen öğretmen");

    if (missing.length > 0) {
      eksikler.push({ id: o.id, name: o.name, missing });
      for (const m of missing) sayilar[m]++;
    }
  }

  return { eksikler, sayilar, tamam: kapsam.length - eksikler.length, toplam: kapsam.length, kapsamDisi };
}
