"use client";

// Bu modül veritabanına yazar ve YALNIZCA istemciden çağrılabilir.
// Sunucudan da lazım olan saf dönüştürme fonksiyonları kesit-map.ts'te
// ("use client" yok). Buraya saf yardımcı EKLEME — Server Component'ten
// çağrılırsa çalışma zamanında "is not a function" ile patlar ve bunun
// build-time koruması yok (bkz. kesit-map.ts başlığı).
import { createClient } from "@/lib/supabase/client";
import type { Kesit } from "./kesit";

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

/**
 * Eşleştirme ekranından yeni okul oluşturur, id'sini döner.
 *
 * IDEMPOTENT: aynı adda okul varsa yenisini açmaz, mevcudun id'sini döner.
 * Sebebi: okullar tek tek ve transaction'sız yaratılıyor (Supabase JS çok
 * tablolu işlemi tek transaction'da yapamaz). 31 kurumun 17.'sinde hata
 * olursa ilk 16 okul veritabanında kalır; kullanıcı tekrar denediğinde ad
 * kontrolü olmasaydı o 16 okul MÜKERRER açılırdı.
 *
 * `schools.city` NOT NULL ama boş string'e izin verir; rapor şehir bilgisi
 * içermediği için boş geçilebilir, kullanıcı sonra doldurur.
 */
export async function okulOlustur(ad: string, sehir: string): Promise<string> {
  const sb = createClient();
  const temizAd = ad.trim();

  // ilike joker içermiyor → büyük/küçük harf duyarsız TAM eşleşme
  const { data: mevcut } = await sb
    .from("schools")
    .select("id")
    .ilike("name", temizAd)
    .limit(1);

  if (mevcut && mevcut.length > 0) return mevcut[0].id;

  const { data, error } = await sb
    .from("schools")
    .insert({ name: temizAd, city: sehir, status: "aktif" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`"${temizAd}" okulu oluşturulamadı: ${error?.message ?? "bilinmeyen hata"}`);
  return data.id;
}
