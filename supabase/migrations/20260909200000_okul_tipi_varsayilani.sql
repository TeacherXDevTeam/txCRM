-- =====================================================================
-- schools.school_type varsayılanı: 'devlet' → 'ozel'
--
-- NEDEN: TeacherX'in çalıştığı kurumların tamamı özel. Şema varsayılanı
-- 'devlet' olduğu için, tipi belirtilmeden açılan her okul (özellikle
-- rapor içe aktarmasıyla açılanlar) yanlış etiketleniyordu.
--
-- Bu migration YALNIZCA VARSAYILANI değiştirir; mevcut satırlara dokunmaz.
-- Geçmişi düzeltmek için: supabase/sorgular/okul_tipi_duzelt.sql
-- =====================================================================

alter table schools alter column school_type set default 'ozel';
