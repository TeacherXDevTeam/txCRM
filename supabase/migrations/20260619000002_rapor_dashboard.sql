-- =====================================================================
-- Rapor Dashboard — Excel snapshot + sözleşmeye bağlı öğretmen sayısı
-- Canlıya Supabase SQL Editor'den uygulanır. Bu dosya repo kaydıdır.
-- =====================================================================

-- 1) Sözleşmeye "olması gereken öğretmen sayısı" -----------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS expected_teacher_count integer;

-- 2) Yükleme snapshot'ı + satırlar ------------------------------------
CREATE TABLE IF NOT EXISTS report_uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by  uuid REFERENCES team_members(id) ON DELETE SET NULL,
  dosya_adi    text,
  satir_sayisi integer NOT NULL DEFAULT 0,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_rows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id       uuid NOT NULL REFERENCES report_uploads(id) ON DELETE CASCADE,
  ad_soyad        text,
  eposta          text,
  sube            text,
  kurum_adi       text,
  tamamlanan      integer NOT NULL DEFAULT 0,
  devam_eden      integer NOT NULL DEFAULT 0,
  tamamlama_yuzde numeric(5,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS report_rows_upload_idx ON report_rows(upload_id);
CREATE INDEX IF NOT EXISTS report_rows_kurum_idx  ON report_rows(upload_id, kurum_adi);

-- 3) RLS: admin + operasyon departmanı --------------------------------
ALTER TABLE report_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_rows    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_uploads_rw ON report_uploads;
CREATE POLICY report_uploads_rw ON report_uploads FOR ALL
USING ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' )
WITH CHECK ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' );

DROP POLICY IF EXISTS report_rows_rw ON report_rows;
CREATE POLICY report_rows_rw ON report_rows FOR ALL
USING ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' )
WITH CHECK ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' );
