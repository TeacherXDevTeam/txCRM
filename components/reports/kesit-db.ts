"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { Kesit, KesitKurum } from "./kesit";

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

export interface KaydetGirdisi {
  kesit: Kesit;
  kesitTarihi: string;          // YYYY-MM-DD
  dosyaAdi: string;
  kaynakSatir: number;
  kullaniciId: string;
  /** kurum adı → school_id (null = bağlanmayacak) */
  okulBaglantilari: Record<string, string | null>;
}

export interface KaydetSonucu {
  kesitId: string;
  kurumSayisi: number;
  baglananOkul: number;
}

/**
 * Kesiti veritabanına yazar.
 *
 * Aynı `kesit_tarihi` varsa önce silinir — `report_kesit` üzerindeki
 * ON DELETE CASCADE bağlı kurum/şube/eğitim/sertifika satırlarını da temizler.
 * Böylece aynı gün yeniden yükleme, yarım kalmış bir karışım bırakmaz.
 *
 * Not: Supabase JS istemcisi çok tablolu işlemi tek transaction'da yapamaz.
 * Sıra bilinçli: önce eski kesit silinir, sonra yenisi yazılır. Araya bir hata
 * girerse eksik kesit kalır; kullanıcı aynı dosyayı yeniden yükleyerek düzeltir.
 */
export async function kesitKaydet(g: KaydetGirdisi): Promise<KaydetSonucu> {
  const sb = createClient();

  // 1) aynı tarihli kesit varsa temizle
  const { error: silHata } = await sb.from("report_kesit").delete().eq("kesit_tarihi", g.kesitTarihi);
  if (silHata) throw new Error(`Önceki kesit silinemedi: ${silHata.message}`);

  // 2) kesit başlığı
  const { data: kesitRow, error: kesitHata } = await sb
    .from("report_kesit")
    .insert({
      kesit_tarihi: g.kesitTarihi,
      dosya_adi: g.dosyaAdi,
      kaynak_satir: g.kaynakSatir,
      yukleyen: g.kullaniciId || null,
    })
    .select("id")
    .single();
  if (kesitHata || !kesitRow) throw new Error(`Kesit oluşturulamadı: ${kesitHata?.message ?? "bilinmeyen hata"}`);
  const kesitId = kesitRow.id;

  // 3) kurumlar — id'leri geri alıyoruz ki alt tablolar bağlanabilsin
  const { data: kurumRows, error: kurumHata } = await sb
    .from("report_kurum")
    .insert(
      g.kesit.kurumlar.map((k) => ({
        kesit_id: kesitId,
        kurum_adi: k.kurumAdi,
        school_id: g.okulBaglantilari[k.kurumAdi] ?? null,
        kaynak: k.kaynak,
        ogretmen_sayisi: k.ogretmenSayisi,
        sube_sayisi: k.subeSayisi,
        egitim_sayisi: k.egitimSayisi,
        kayit_sayisi: k.kayitSayisi,
        ilerleme_ortalamasi: k.ilerlemeOrtalamasi,
        tamamlanma_orani: k.tamamlanmaOrani,
        tamamlanan_egitim: k.tamamlananEgitim,
        sertifika_sayisi: k.sertifikaSayisi,
        sertifika_alan: k.sertifikaAlan,
        hic_baslamayan: k.hicBaslamayan,
        devam_eden: k.devamEden,
        tumunu_tamamlayan: k.tumunuTamamlayan,
        esitsiz_atama: k.esitsizAtama,
      }))
    )
    .select("id, kurum_adi");
  if (kurumHata || !kurumRows) throw new Error(`Kurumlar yazılamadı: ${kurumHata?.message ?? "bilinmeyen hata"}`);

  const idler = new Map(kurumRows.map((r) => [r.kurum_adi, r.id]));

  // 4) alt tablolar — hepsi tek seferde
  const subeler = g.kesit.kurumlar.flatMap((k) =>
    k.subeler.map((s) => ({
      kurum_id: idler.get(k.kurumAdi)!,
      sube_adi: s.subeAdi,
      ogretmen_sayisi: s.ogretmenSayisi,
      egitim_sayisi: s.egitimSayisi,
      ilerleme_ortalamasi: s.ilerlemeOrtalamasi,
      tamamlanma_orani: s.tamamlanmaOrani,
      sertifika_sayisi: s.sertifikaSayisi,
      hic_baslamayan: s.hicBaslamayan,
      devam_eden: s.devamEden,
      tumunu_tamamlayan: s.tumunuTamamlayan,
    }))
  );
  if (subeler.length > 0) {
    const { error } = await sb.from("report_sube").insert(subeler);
    if (error) throw new Error(`Şubeler yazılamadı: ${error.message}`);
  }

  const egitimler = g.kesit.kurumlar.flatMap((k) =>
    k.egitimler.map((e) => ({
      kurum_id: idler.get(k.kurumAdi)!,
      egitim_adi: e.egitimAdi,
      atanan_ogretmen: e.atananOgretmen,
      tamamlayan: e.tamamlayan,
      tamamlanma_orani: e.tamamlanmaOrani,
      hic_baslamayan: e.hicBaslamayan,
      sertifika_sayisi: e.sertifikaSayisi,
    }))
  );
  if (egitimler.length > 0) {
    const { error } = await sb.from("report_egitim").insert(egitimler);
    if (error) throw new Error(`Eğitimler yazılamadı: ${error.message}`);
  }

  const sertAylar = g.kesit.kurumlar.flatMap((k) =>
    k.sertifikaAylik.map((a) => ({ kurum_id: idler.get(k.kurumAdi)!, ay: a.ay, adet: a.adet }))
  );
  if (sertAylar.length > 0) {
    const { error } = await sb.from("report_sertifika_ay").insert(sertAylar);
    if (error) throw new Error(`Sertifika ayları yazılamadı: ${error.message}`);
  }

  return {
    kesitId,
    kurumSayisi: kurumRows.length,
    baglananOkul: Object.values(g.okulBaglantilari).filter(Boolean).length,
  };
}

/** Eşleştirme ekranından yeni okul oluşturur, id'sini döner. */
export async function okulOlustur(ad: string, sehir: string): Promise<string> {
  const sb = createClient();
  const { data, error } = await sb
    .from("schools")
    .insert({ name: ad, city: sehir, status: "aktif" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Okul oluşturulamadı: ${error?.message ?? "bilinmeyen hata"}`);
  return data.id;
}
