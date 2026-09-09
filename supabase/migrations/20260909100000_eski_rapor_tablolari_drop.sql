-- =====================================================================
-- Adım 9 — eski rapor tablolarının kaldırılması
-- PLAN_KURUM_TAKIP_PANOSU.md §Adım 9
--
-- Canlıya Supabase SQL Editor'den uygulanır; bu dosya repo kaydıdır.
--
-- NEDEN: bu iki tablo, Raporlar sayfasının eski "Öğretmen Özeti" ve
-- "Kurs Bazlı" sekmelerine aitti. O sekmeler 2026-09-09'da kaldırıldı ve
-- yerlerini kesit tabloları aldı (report_kesit / report_kurum / report_sube /
-- report_egitim / report_sertifika_ay). Kodda tek bir referansları kalmadı.
--
-- ÖNCE DOĞRULA: aşağıdaki sorgu kaç satır kaybedileceğini söyler.
-- Beklenen sonuç, eski sekmelerle yapılmış yüklemelerdir; bu veri kesit
-- tablolarında YENİDEN ÜRETİLEBİLİR (aynı Excel yeniden yüklenir).
--
--   select 'report_uploads' as tablo, count(*) from report_uploads
--   union all
--   select 'report_kurum_stats', count(*) from report_kurum_stats;
--
-- GERİ ALINAMAZ. Silmeden önce yukarıdaki sorgunun sonucuna bakın.
-- =====================================================================

-- Sıra önemli: report_kurum_stats.upload_id → report_uploads(id) FK'sı var.
-- CASCADE yerine açık sıra tercih edildi ki beklenmeyen bir bağımlılık
-- varsa hata versin, sessizce başka bir şey silinmesin.
drop table if exists report_kurum_stats;
drop table if exists report_uploads;
