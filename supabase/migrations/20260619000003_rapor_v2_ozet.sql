-- =====================================================================
-- Rapor v2 — kurs bazlı rapor için kurum-özet (performans: ham satır yok)
-- Canlıya SQL Editor'den uygulanır.
-- =====================================================================

-- Eski ham-satır tablosu (sadece test verisi içeriyordu) kaldırılıyor
DROP TABLE IF EXISTS report_rows;

-- Kurum bazlı önceden hesaplanmış özet (yükleme anında tarayıcıda üretilir)
CREATE TABLE IF NOT EXISTS report_kurum_stats (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id     uuid NOT NULL REFERENCES report_uploads(id) ON DELETE CASCADE,
  kurum         text NOT NULL,
  teacher_count integer NOT NULL DEFAULT 0,
  stats         jsonb NOT NULL,            -- şube/kurs/bucket/risk/KPI özetleri
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_kurum_stats_upload_idx ON report_kurum_stats(upload_id);

ALTER TABLE report_kurum_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_kurum_stats_rw ON report_kurum_stats;
CREATE POLICY report_kurum_stats_rw ON report_kurum_stats FOR ALL
USING ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' )
WITH CHECK ( get_my_role() = 'admin'
        OR (SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon' );
