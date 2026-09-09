// Kesit satırlarını ekranın beklediği şekle çeviren SAF fonksiyonlar.
//
// Bu dosyada "use client" YOK ve olmamalı: `raporlar/page.tsx` bir Server
// Component ve bu fonksiyonu sunucuda çağırıyor. İstemci modülünden içe
// aktarılırsa App Router gerçek fonksiyon yerine bir istemci referansı verir
// ve çağrı "satirlariKesiteCevir is not a function" ile patlar — bu üretimde
// yaşandı. Veritabanına dokunan kısımlar kesit-db.ts'te (istemci tarafı).

import type { Database } from "@/types/database";
import type { KesitKurum } from "./kesit";
import type { OncekiKarar } from "./kurum-eslestir";

type KurumRow = Database["public"]["Tables"]["report_kurum"]["Row"];
type SubeRow = Database["public"]["Tables"]["report_sube"]["Row"];
type EgitimRow = Database["public"]["Tables"]["report_egitim"]["Row"];
type SertAyRow = Database["public"]["Tables"]["report_sertifika_ay"]["Row"];

export interface KayitliKesit {
  id: string;
  kesitTarihi: string;
  dosyaAdi: string | null;
  kaynakSatir: number;
  kurumlar: KesitKurum[];
  /** kurum adı → report_kurum.id (eşleştirme güncellemesi için) */
  kurumIdleri: Record<string, string>;
  /** kurum adı → school_id */
  okulBaglantilari: Record<string, string | null>;
}

/** DB satırlarını ekranın beklediği KesitKurum şekline çevirir. */
export function satirlariKesiteCevir(
  kurumlar: KurumRow[], subeler: SubeRow[], egitimler: EgitimRow[], sertAylar: SertAyRow[]
): KesitKurum[] {
  const subeMap = new Map<string, SubeRow[]>();
  for (const s of subeler) (subeMap.get(s.kurum_id) ?? subeMap.set(s.kurum_id, []).get(s.kurum_id)!).push(s);
  const egitimMap = new Map<string, EgitimRow[]>();
  for (const e of egitimler) (egitimMap.get(e.kurum_id) ?? egitimMap.set(e.kurum_id, []).get(e.kurum_id)!).push(e);
  const sertMap = new Map<string, SertAyRow[]>();
  for (const a of sertAylar) (sertMap.get(a.kurum_id) ?? sertMap.set(a.kurum_id, []).get(a.kurum_id)!).push(a);

  return kurumlar
    .map((k) => ({
      kaynak: k.kaynak,
      kurumAdi: k.kurum_adi,
      ogretmenSayisi: k.ogretmen_sayisi,
      subeSayisi: k.sube_sayisi,
      egitimSayisi: k.egitim_sayisi,
      kayitSayisi: k.kayit_sayisi,
      ilerlemeOrtalamasi: Number(k.ilerleme_ortalamasi),
      tamamlanmaOrani: Number(k.tamamlanma_orani),
      tamamlananEgitim: k.tamamlanan_egitim,
      sertifikaSayisi: k.sertifika_sayisi,
      sertifikaAlan: k.sertifika_alan,
      hicBaslamayan: k.hic_baslamayan,
      devamEden: k.devam_eden,
      tumunuTamamlayan: k.tumunu_tamamlayan,
      esitsizAtama: k.esitsiz_atama,
      subeler: (subeMap.get(k.id) ?? [])
        .map((s) => ({
          subeAdi: s.sube_adi,
          ogretmenSayisi: s.ogretmen_sayisi,
          egitimSayisi: s.egitim_sayisi,
          ilerlemeOrtalamasi: Number(s.ilerleme_ortalamasi),
          tamamlanmaOrani: Number(s.tamamlanma_orani),
          sertifikaSayisi: s.sertifika_sayisi,
          hicBaslamayan: s.hic_baslamayan,
          devamEden: s.devam_eden,
          tumunuTamamlayan: s.tumunu_tamamlayan,
        }))
        .sort((a, b) => b.ilerlemeOrtalamasi - a.ilerlemeOrtalamasi),
      egitimler: (egitimMap.get(k.id) ?? [])
        .map((e) => ({
          egitimAdi: e.egitim_adi,
          atananOgretmen: e.atanan_ogretmen,
          tamamlayan: e.tamamlayan,
          tamamlanmaOrani: Number(e.tamamlanma_orani),
          hicBaslamayan: e.hic_baslamayan,
          sertifikaSayisi: e.sertifika_sayisi,
        }))
        .sort((a, b) => a.tamamlanmaOrani - b.tamamlanmaOrani),
      sertifikaAylik: (sertMap.get(k.id) ?? [])
        .map((a) => ({ ay: a.ay, adet: a.adet }))
        .sort((a, b) => a.ay.localeCompare(b.ay)),
    }))
    .sort((a, b) => a.kurumAdi.localeCompare(b.kurumAdi, "tr"));
}

/**
 * Kaydedilmiş kesitlerden kurum → son eşleştirme kararını çıkarır.
 *
 * `report_kurum` satırı VARSA bir karar verilmiş demektir: `school_id` doluysa
 * okula bağlanmış, `null` ise kullanıcı bilerek "Bağlama" demiş. Satır yoksa
 * kurum hiç görülmemiştir. Bu ayrım önemli — "bağlama" kararı da hatırlanmalı,
 * yoksa her yüklemede yeniden "yeni okul olarak ekle" diye önerilir.
 *
 * Aynı kurum birden çok kesitte varsa EN SON kesitteki karar geçerlidir.
 */
export function oncekiKararlariCikar(
  kesitler: { id: string; kesit_tarihi: string }[],
  kurumSatirlari: { kesit_id: string; kurum_adi: string; school_id: string | null }[],
): Record<string, OncekiKarar> {
  const tarih = new Map(kesitler.map((k) => [k.id, k.kesit_tarihi]));
  const sonuc: Record<string, OncekiKarar> = {};

  for (const r of kurumSatirlari) {
    const t = tarih.get(r.kesit_id);
    if (t === undefined) continue;
    const mevcut = sonuc[r.kurum_adi];
    if (mevcut === undefined || t > mevcut.tarih) {
      sonuc[r.kurum_adi] = { schoolId: r.school_id, tarih: t };
    }
  }
  return sonuc;
}
