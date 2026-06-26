-- =====================================================================
-- Lead → Teklif Akışı + Bildirim (Platform Foundation ilk gerçek parçası)
-- Not: Bu SQL canlı DB'ye Supabase SQL Editor üzerinden uygulandı.
-- Dosya repo kaydı/senkron amaçlıdır.
-- =====================================================================

-- 1) Eksik lead aşamalarını ekle (UI/DB hizalama) ---------------------
ALTER TYPE lead_stage_enum ADD VALUE IF NOT EXISTS 'ilk_gorusme';
ALTER TYPE lead_stage_enum ADD VALUE IF NOT EXISTS 'ihtiyac_analizi';
ALTER TYPE lead_stage_enum ADD VALUE IF NOT EXISTS 'teklif_istendi';

-- 2) Gerçek notifications tablosu (polymorphic, kişi-bazlı) -----------
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  type         text NOT NULL DEFAULT 'info',
  title        text NOT NULL,
  body         text,
  entity_type  text,             -- 'lead' | ... (polymorphic tıklama linki)
  entity_id    uuid,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications(recipient_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
  FOR ALL USING (recipient_id = auth.uid()) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 3) Aşama değişiminde otomatik olay + bildirim (trigger) -------------
CREATE OR REPLACE FUNCTION on_lead_stage_change()
RETURNS TRIGGER AS $$
DECLARE m RECORD; changed boolean;
BEGIN
  -- INSERT (doğrudan o aşamada oluşturma) VEYA stage değişimi
  changed := (TG_OP = 'INSERT') OR (NEW.stage IS DISTINCT FROM OLD.stage);
  IF changed THEN
    -- zaman çizelgesi
    INSERT INTO activities(lead_id, created_by, activity_type, summary)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.assigned_to), 'not',
            CASE WHEN TG_OP = 'INSERT'
                 THEN 'Lead oluşturuldu — aşama: ' || NEW.stage
                 ELSE 'Aşama: ' || OLD.stage || ' → ' || NEW.stage END);

    -- Teklif İstendi → operasyon ekibine (fan-out)
    IF (NEW.stage = 'teklif_istendi') THEN
      FOR m IN SELECT id FROM team_members
               WHERE department = 'operasyon' AND is_active LOOP
        INSERT INTO notifications(recipient_id, type, title, body, entity_type, entity_id)
        VALUES (m.id, 'teklif_talebi', 'Teklif istendi',
                'Bir lead için teklif hazırlanması gerekiyor.', 'lead', NEW.id);
      END LOOP;
    END IF;

    -- Teklif Verildi → atanan satışçıya
    IF (NEW.stage = 'teklif_verildi' AND NEW.assigned_to IS NOT NULL) THEN
      INSERT INTO notifications(recipient_id, type, title, body, entity_type, entity_id)
      VALUES (NEW.assigned_to, 'teklif_verildi', 'Teklif verildi',
              'Teklif iletildi, lead "Teklif Verildi" aşamasına geçti.', 'lead', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lead_stage_change ON leads;
CREATE TRIGGER lead_stage_change AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION on_lead_stage_change();

-- 4) Operasyon, teklif aşamasındaki lead'leri görüp ilerletebilsin (RLS) --
DROP POLICY IF EXISTS "leads_select" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  get_my_role() = 'admin' OR assigned_to = auth.uid()
  OR ((SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon'
      AND stage IN ('teklif_istendi','teklif_verildi'))
);
DROP POLICY IF EXISTS "leads_update" ON leads;
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  get_my_role() = 'admin' OR assigned_to = auth.uid()
  OR ((SELECT department FROM team_members WHERE id = auth.uid()) = 'operasyon'
      AND stage IN ('teklif_istendi','teklif_verildi'))
);
