-- ============================================================
-- TeacherX CRM — RLS Politikaları
-- PRD §5 (RLS Stratejisi) + §6 (İzin Matrisi)
-- ============================================================

-- RLS'i tüm tablolarda etkinleştir
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE wg_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wg_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wg_phases ENABLE ROW LEVEL SECURITY;

-- Helper function: mevcut kullanıcının rolünü döndürür
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS team_role_enum AS $$
  SELECT role FROM team_members WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: mevcut kullanıcının departmanını döndürür
CREATE OR REPLACE FUNCTION get_my_department()
RETURNS team_department_enum AS $$
  SELECT department FROM team_members WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- team_members: herkes kendi kaydını okuyabilir, admin hepsini
-- ============================================================
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    id = auth.uid() OR get_my_role() = 'admin'
  );

CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    id = auth.uid() OR get_my_role() = 'admin'
  );

CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (get_my_role() = 'admin');

-- ============================================================
-- contacts: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'member'));

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (get_my_role() = 'admin');

-- ============================================================
-- schools: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "schools_select" ON schools
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "schools_insert" ON schools
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'member'));

CREATE POLICY "schools_update" ON schools
  FOR UPDATE USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "schools_delete" ON schools
  FOR DELETE USING (get_my_role() = 'admin');

-- coordinators
CREATE POLICY "coordinators_select" ON coordinators
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "coordinators_write" ON coordinators
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- onboarding_milestones
CREATE POLICY "onboarding_select" ON onboarding_milestones
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "onboarding_write" ON onboarding_milestones
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- ============================================================
-- leads: sadece assigned_to ve admin (PRD §5 RLS Stratejisi)
-- ============================================================
CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (
    get_my_role() = 'admin' OR assigned_to = auth.uid()
  );

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'member'));

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (
    get_my_role() = 'admin' OR assigned_to = auth.uid()
  );

CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (get_my_role() = 'admin');

-- activities: school veya lead üzerinden yetki kontrolü
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    get_my_role() IS NOT NULL AND (
      school_id IS NOT NULL OR
      lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid()) OR
      get_my_role() = 'admin'
    )
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'member'));

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (
    created_by = auth.uid() OR get_my_role() = 'admin'
  );

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (get_my_role() = 'admin');

-- ============================================================
-- trainings & packages: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "trainings_select" ON trainings
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "trainings_write" ON trainings
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "packages_select" ON packages
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "packages_write" ON packages
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "package_trainings_select" ON package_trainings
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "package_trainings_write" ON package_trainings
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- trainers
CREATE POLICY "trainers_select" ON trainers
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "trainers_write" ON trainers
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- ============================================================
-- assignments: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "assignments_select" ON assignments
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "assignments_write" ON assignments
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- ============================================================
-- contracts: sadece admin ve operasyon departmanı (PRD §5)
-- ============================================================
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (
    get_my_role() = 'admin' OR get_my_department() = 'operasyon'
  );

CREATE POLICY "contracts_write" ON contracts
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (
    get_my_role() = 'admin' OR get_my_department() = 'operasyon'
  );

CREATE POLICY "orders_write" ON orders
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- meetings & todo_items: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "meetings_select" ON meetings
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "meetings_write" ON meetings
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "meeting_contacts_select" ON meeting_contacts
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "meeting_contacts_write" ON meeting_contacts
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "todo_items_select" ON todo_items
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "todo_items_write" ON todo_items
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- ============================================================
-- working_groups: herkes okuyabilir, viewer yazamaz
-- ============================================================
CREATE POLICY "working_groups_select" ON working_groups
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "working_groups_write" ON working_groups
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "wg_members_select" ON wg_members
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "wg_members_write" ON wg_members
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "wg_sessions_select" ON wg_sessions
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "wg_sessions_write" ON wg_sessions
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

CREATE POLICY "wg_phases_select" ON wg_phases
  FOR SELECT USING (get_my_role() IS NOT NULL);

CREATE POLICY "wg_phases_write" ON wg_phases
  FOR ALL USING (get_my_role() IN ('admin', 'member'));

-- ============================================================
-- Auth trigger: Supabase Auth'dan team_members'a otomatik kayıt
-- (Admin davet ettiğinde auth.users'a kullanıcı eklenir,
--  bu trigger team_members tablosunu doldurur)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::team_role_enum, 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- last_login güncelleme trigger'ı
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE team_members SET last_login = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_login();
