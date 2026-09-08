-- =====================================================================
-- Rapor formatı ayrımı — "Öğretmen Özeti" ve "Kurs Bazlı" raporlar
-- birbirini ezmeden yan yana dursun.
--
-- Canlıya Supabase SQL Editor'den uygulanır; bu dosya repo kaydıdır.
-- Tamamen additive ve idempotent — mevcut veriye dokunmaz.
-- =====================================================================

-- Mevcut satırların hepsi kurs bazlı yüklemelerdi → DEFAULT 'kurs' onları doğru etiketler.
ALTER TABLE report_uploads
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'kurs';

-- Geçerli değerleri sınırla (constraint zaten varsa sessizce geç)
DO $$
BEGIN
  ALTER TABLE report_uploads
    ADD CONSTRAINT report_uploads_format_chk CHECK (format IN ('kurs', 'ogretmen'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- "Bu formatın en son yüklemesi" sorgusu için
CREATE INDEX IF NOT EXISTS report_uploads_format_idx
  ON report_uploads (format, uploaded_at DESC);

COMMENT ON COLUMN report_uploads.format IS
  'Yüklenen Excel''in şeması: kurs = satır başına öğretmen×kurs (Kurs + Sertifika Tarihi sütunlu); ogretmen = satır başına öğretmen (Tamamlanan + Devam Eden + Tamamlama % sütunlu).';
