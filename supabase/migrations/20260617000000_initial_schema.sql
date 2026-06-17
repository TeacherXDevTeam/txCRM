-- ============================================================
-- TeacherX CRM — Initial Schema
-- PRD v0.2 §4 — Tüm tablolar
-- ============================================================

-- Enum types
CREATE TYPE contact_type_enum AS ENUM (
  'okul_koordinatoru', 'egitmen', 'partner', 'potansiyel', 'diger'
);

CREATE TYPE school_type_enum AS ENUM ('devlet', 'ozel', 'vakif');
CREATE TYPE school_status_enum AS ENUM ('aktif', 'pasif', 'potansiyel');

CREATE TYPE activity_type_enum AS ENUM (
  'telefon', 'eposta', 'toplanti', 'ziyaret', 'not'
);

CREATE TYPE lead_stage_enum AS ENUM (
  'yeni_baglanti', 'teklif_iletildi', 'gorusme_yapildi',
  'teklif_verildi', 'kapandi_kazanildi', 'kapandi_kaybedildi'
);

CREATE TYPE lead_source_enum AS ENUM (
  'referans', 'etkinlik', 'soguk_arama', 'web', 'diger'
);

CREATE TYPE training_category_enum AS ENUM (
  'yapay_zeka', 'olumlu_okul_iklimi', 'etkili_ogretmenlik', 'diger'
);

CREATE TYPE training_format_enum AS ENUM ('yuz_yuze', 'cevrimici', 'hibrit');
CREATE TYPE training_status_enum AS ENUM ('aktif', 'pasif', 'gelistirme');

CREATE TYPE assignment_status_enum AS ENUM (
  'planlanmis', 'devam_ediyor', 'tamamlandi', 'iptal'
);

CREATE TYPE meeting_type_enum AS ENUM (
  'core_group', 'ekip', 'okul_ziyareti', 'wg_oturumu', 'diger'
);

CREATE TYPE todo_status_enum AS ENUM ('acik', 'tamamlandi');

CREATE TYPE contract_payment_status_enum AS ENUM (
  'odeme_bekleniyor', 'kismi', 'tamamlandi'
);

CREATE TYPE contract_status_enum AS ENUM ('aktif', 'suresi_doldu', 'iptal');

CREATE TYPE wg_status_enum AS ENUM ('aktif', 'tamamlandi', 'beklemede');

CREATE TYPE wg_member_role_enum AS ENUM (
  'kolaylastirici', 'katilimci', 'gozlemci'
);

CREATE TYPE wg_phase_status_enum AS ENUM (
  'planlandi', 'devam_ediyor', 'tamamlandi'
);

CREATE TYPE team_role_enum AS ENUM ('admin', 'member', 'viewer');

CREATE TYPE team_department_enum AS ENUM (
  'satis', 'operasyon', 'icerik', 'egitim'
);

CREATE TYPE trainer_status_enum AS ENUM ('aktif', 'pasif');
CREATE TYPE package_status_enum AS ENUM ('aktif', 'pasif');

-- ============================================================
-- M9: team_members (auth tablosuna bağlı)
-- ============================================================
CREATE TABLE team_members (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  role        team_role_enum NOT NULL DEFAULT 'member',
  department  team_department_enum,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M0: contacts
-- ============================================================
CREATE TABLE contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT UNIQUE,
  phone            TEXT,
  title            TEXT,
  organization     TEXT,
  contact_type     contact_type_enum NOT NULL DEFAULT 'diger',
  notes            TEXT,
  linked_school_id UUID, -- FK added after schools table
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M1: schools
-- ============================================================
CREATE TABLE schools (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  city                  TEXT NOT NULL,
  district              TEXT,
  school_type           school_type_enum NOT NULL DEFAULT 'devlet',
  status                school_status_enum NOT NULL DEFAULT 'potansiyel',
  partnership_start_date DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- contacts → schools FK (self-referential resolved)
ALTER TABLE contacts
  ADD CONSTRAINT contacts_linked_school_id_fkey
  FOREIGN KEY (linked_school_id) REFERENCES schools(id) ON DELETE SET NULL;

-- ============================================================
-- M1: coordinators
-- ============================================================
CREATE TABLE coordinators (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, contact_id)
);

-- ============================================================
-- M1: onboarding_milestones
-- ============================================================
CREATE TYPE onboarding_milestone_key_enum AS ENUM (
  'sozlesme_imzalandi',
  'koordinator_girildi',
  'egitim_paketi_belirlendi',
  'acilis_toplantisi_yapildi',
  'certifiX_hesabi_olusturuldu'
);

CREATE TABLE onboarding_milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  milestone_key onboarding_milestone_key_enum NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  UNIQUE (school_id, milestone_key)
);

-- ============================================================
-- M2: leads
-- ============================================================
CREATE TABLE leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  school_id        UUID REFERENCES schools(id) ON DELETE SET NULL,
  stage            lead_stage_enum NOT NULL DEFAULT 'yeni_baglanti',
  assigned_to      UUID REFERENCES team_members(id) ON DELETE SET NULL,
  source           lead_source_enum NOT NULL DEFAULT 'diger',
  estimated_value  NUMERIC(12, 2),
  next_action_date DATE,
  reminder_sent    BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M1+M2: activities (polimorfik: school veya lead)
-- ============================================================
CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  activity_type activity_type_enum NOT NULL,
  summary       TEXT NOT NULL,
  details       TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activities_must_have_parent CHECK (
    school_id IS NOT NULL OR lead_id IS NOT NULL
  )
);

-- ============================================================
-- M3: trainings
-- ============================================================
CREATE TABLE trainings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  category       training_category_enum NOT NULL DEFAULT 'diger',
  format         training_format_enum NOT NULL DEFAULT 'yuz_yuze',
  duration_hours NUMERIC(5, 2),
  status         training_status_enum NOT NULL DEFAULT 'aktif',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M3: packages
-- ============================================================
CREATE TABLE packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  status      package_status_enum NOT NULL DEFAULT 'aktif',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE package_trainings (
  package_id  UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, training_id)
);

-- ============================================================
-- M6: trainers
-- ============================================================
CREATE TABLE trainers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE RESTRICT,
  expertise_areas  TEXT[] NOT NULL DEFAULT '{}',
  status           trainer_status_enum NOT NULL DEFAULT 'aktif',
  bio              TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M4: assignments
-- ============================================================
CREATE TABLE assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  training_id      UUID NOT NULL REFERENCES trainings(id) ON DELETE RESTRICT,
  trainer_id       UUID REFERENCES trainers(id) ON DELETE SET NULL,
  assigned_to      UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  status           assignment_status_enum NOT NULL DEFAULT 'planlanmis',
  scheduled_date   DATE,
  completed_date   DATE,
  period           TEXT, -- örn: "2026-Q3"
  notes            TEXT,
  completion_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M7: contracts
-- ============================================================
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  package_id      UUID REFERENCES packages(id) ON DELETE SET NULL,
  created_by      UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  contract_value  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_status  contract_payment_status_enum NOT NULL DEFAULT 'odeme_bekleniyor',
  status          contract_status_enum NOT NULL DEFAULT 'aktif',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  training_id   UUID NOT NULL REFERENCES trainings(id) ON DELETE RESTRICT,
  unit_price    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity      INTEGER NOT NULL DEFAULT 1,
  discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M5: meetings
-- ============================================================
CREATE TABLE meetings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  meeting_date        TIMESTAMPTZ NOT NULL,
  meeting_type        meeting_type_enum NOT NULL DEFAULT 'diger',
  notes               TEXT, -- markdown
  related_entity_type TEXT, -- 'school' | 'lead' | 'working_group' | 'trainer' | 'diger'
  related_entity_id   UUID,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  created_by          UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meeting_contacts (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, contact_id)
);

-- Full-text search index (Türkçe için simple config)
ALTER TABLE meetings ADD COLUMN notes_tsvector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(notes, '') || ' ' || coalesce(title, ''))) STORED;

CREATE INDEX meetings_notes_tsvector_idx ON meetings USING gin(notes_tsvector);

-- ============================================================
-- M5: todo_items
-- ============================================================
CREATE TABLE todo_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  due_date    DATE,
  status      todo_status_enum NOT NULL DEFAULT 'acik',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- M8: working_groups
-- ============================================================
CREATE TABLE working_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  status        wg_status_enum NOT NULL DEFAULT 'aktif',
  start_date    DATE,
  end_date      DATE,
  current_phase TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wg_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role             wg_member_role_enum NOT NULL DEFAULT 'katilimci',
  school_id        UUID REFERENCES schools(id) ON DELETE SET NULL,
  joined_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at          DATE,
  UNIQUE (working_group_id, contact_id)
);

CREATE TABLE wg_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  session_date     DATE NOT NULL,
  title            TEXT NOT NULL,
  format           training_format_enum NOT NULL DEFAULT 'yuz_yuze',
  notes            TEXT,
  attendee_ids     UUID[] NOT NULL DEFAULT '{}',
  meeting_id       UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wg_phases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  phase_number     INTEGER NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  start_date       DATE,
  end_date         DATE,
  status           wg_phase_status_enum NOT NULL DEFAULT 'planlandi',
  UNIQUE (working_group_id, phase_number)
);

-- ============================================================
-- updated_at trigger (tüm tablolarda)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_groups_updated_at
  BEFORE UPDATE ON working_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Indexes (performans)
-- ============================================================
CREATE INDEX contacts_email_idx ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX contacts_contact_type_idx ON contacts(contact_type);
CREATE INDEX schools_status_idx ON schools(status);
CREATE INDEX schools_city_idx ON schools(city);
CREATE INDEX leads_stage_idx ON leads(stage);
CREATE INDEX leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX leads_next_action_date_idx ON leads(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX assignments_status_idx ON assignments(status);
CREATE INDEX assignments_scheduled_date_idx ON assignments(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX assignments_school_id_idx ON assignments(school_id);
CREATE INDEX todo_items_assigned_to_idx ON todo_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX todo_items_status_idx ON todo_items(status);
CREATE INDEX activities_school_id_idx ON activities(school_id);
CREATE INDEX activities_lead_id_idx ON activities(lead_id);
CREATE INDEX contracts_end_date_idx ON contracts(end_date);
CREATE INDEX meetings_meeting_date_idx ON meetings(meeting_date);
