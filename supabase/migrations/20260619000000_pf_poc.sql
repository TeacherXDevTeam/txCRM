-- =====================================================================
-- Platform Foundation — PoC (DENEME)
-- Additive: yalnızca pf_ önekli YENİ tablolar. Mevcut şemaya dokunmaz.
-- v2 kararının küçük kanıtı:
--   * status-driven mutasyon  → DB trigger
--   * polymorphic olay günlüğü (pf_activities)
--   * polymorphic bildirim    (pf_notifications)
-- Geri almak için en alttaki DROP bloğunu çalıştır.
-- =====================================================================

-- 1) Demo "süreç" varlığı --------------------------------------------------
CREATE TABLE IF NOT EXISTS pf_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  owner      TEXT,                                   -- serbest: "satış", "Ahmet" vb.
  status     TEXT NOT NULL DEFAULT 'yeni',           -- yeni | teklif_bekleniyor | hazir
  amount     NUMERIC(12,2),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Polymorphic olay günlüğü (her şeye bağlanabilir, append-only) ----------
CREATE TABLE IF NOT EXISTS pf_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,            -- 'pf_record' (ileride 'lead','school'...)
  entity_id   UUID NOT NULL,
  kind        TEXT NOT NULL,            -- 'status_change' | 'note' | 'created'
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pf_activities_entity_idx
  ON pf_activities (entity_type, entity_id);

-- 3) Polymorphic bildirim (zil akışı, tek yönlü lookup) --------------------
CREATE TABLE IF NOT EXISTS pf_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role  TEXT NOT NULL,        -- demo: role bazlı ("finans","satış")
  title           TEXT NOT NULL,
  body            TEXT,
  entity_type     TEXT,                 -- tıklama linki için
  entity_id       UUID,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pf_notifications_recipient_idx
  ON pf_notifications (recipient_role, is_read);

-- 4) Status-driven trigger: kalbi burada ----------------------------------
--    pf_records.status değişince:
--      a) olay günlüğüne yaz
--      b) 'teklif_bekleniyor'a geçtiyse finansa bildirim üret
CREATE OR REPLACE FUNCTION pf_on_record_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO pf_activities (entity_type, entity_id, kind, summary)
    VALUES ('pf_record', NEW.id, 'created', 'Kayıt oluşturuldu: ' || NEW.title);
    RETURN NEW;
  END IF;

  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO pf_activities (entity_type, entity_id, kind, summary)
    VALUES ('pf_record', NEW.id, 'status_change',
            'Durum: ' || OLD.status || ' → ' || NEW.status);

    IF (NEW.status = 'teklif_bekleniyor') THEN
      INSERT INTO pf_notifications (recipient_role, title, body, entity_type, entity_id)
      VALUES ('finans',
              'Teklif bekleniyor',
              '"' || NEW.title || '" kaydı için teklif hazırlanması gerekiyor.',
              'pf_record', NEW.id);
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pf_records_change ON pf_records;
CREATE TRIGGER pf_records_change
  BEFORE INSERT OR UPDATE ON pf_records
  FOR EACH ROW EXECUTE FUNCTION pf_on_record_change();

-- 5) RLS — PoC: anon + authenticated tam erişim (yalnızca pf_ tabloları) ----
ALTER TABLE pf_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pf_records_all       ON pf_records;
DROP POLICY IF EXISTS pf_activities_all    ON pf_activities;
DROP POLICY IF EXISTS pf_notifications_all ON pf_notifications;

CREATE POLICY pf_records_all       ON pf_records       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pf_activities_all    ON pf_activities    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pf_notifications_all ON pf_notifications FOR ALL USING (true) WITH CHECK (true);

-- Realtime (zil canlı güncellensin diye)
ALTER PUBLICATION supabase_realtime ADD TABLE pf_notifications;

-- =====================================================================
-- GERİ ALMA (gerekirse tek seferde çalıştır):
-- DROP TABLE IF EXISTS pf_notifications, pf_activities, pf_records CASCADE;
-- DROP FUNCTION IF EXISTS pf_on_record_change() CASCADE;
-- =====================================================================
