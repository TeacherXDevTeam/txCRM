# PLAN — Platform Foundation Faz 2 (Uygulama Planı)

> **Bu doküman kimin için:** Bu planı uygulayacak AI oturumu / geliştirici. Bu plan, sistemi analiz eden önceki oturumun çıktısıdır ve **bu konuşma geçmişi olmadan** uygulanabilecek şekilde yazılmıştır.
> **Hazırlayan:** Claude (Fable) — 2026-07-13. Onaylayan: Hasan.

---

## 0. Uygulayıcı için kritik bağlam (ÖNCE OKU)

1. **Ortak canlı DB:** Supabase projesi iki kişi tarafından paylaşılıyor. **DDL (CREATE/ALTER/DROP) anon anahtarla çalışmaz** — tüm şema değişiklikleri kullanıcıya SQL bloğu olarak verilir, kullanıcı Supabase **SQL Editor**'de çalıştırır. Aynı SQL, kayıt için `supabase/migrations/` altına tarih-önekli dosya olarak commit edilir. Bu işleyiş `CurrentState.md → El Değiştirme Notu`nda belgelidir.
2. **Git akışı:** Her iş için `main`'den feature branch → commit → push → PR aç. **PR'ları sen merge ETME** — ekip inceleyip merge eder. Commit mesajı sonu: `Co-Authored-By:` satırı (CLAUDE.md kuralı).
3. **Her iş sonunda** `CurrentState.md`'ye "Son İşlem" bloğu ekle (CLAUDE.md kuralı) ve El Değiştirme Notu'ndaki tabloyu/DB listesini güncelle.
4. **Doğrulama standardı:** her PR öncesi `npm run type-check` + `npm run build` temiz olmalı. (`npm run lint` repo genelinde ESLint 9 uyumsuzluğu nedeniyle bozuk — bu bilinen bir sorun, senin işin değil.)
5. **Mevcut bildirim altyapısı (Faz 1'de kuruldu, yeniden kurma):**
   - `notifications` tablosu: `recipient_id → team_members`, `type, title, body, entity_type, entity_id, is_read` — RLS: `recipient_id = auth.uid()`, Realtime açık.
   - `leads` üzerinde `on_lead_stage_change` trigger'ı (INSERT OR UPDATE): `teklif_istendi` → operasyon departmanına fan-out; `teklif_verildi` → `assigned_to`'ya bildirim; her aşama değişimi `activities`'e yazılır.
   - Header'da `components/notifications/notification-bell.tsx` (Realtime, kişi bazlı).
6. **Bekleyen PR:** [#6 fix/rapor-temizle] — Raporlar "Veriyi Temizle" düzeltmesi. Başlamadan `git fetch` + PR durumlarına bak; merge edilmişse `main`'i çek.
7. **Roller/departmanlar:** `team_members.role ∈ admin|member|viewer`, `department ∈ satis|operasyon|icerik|egitim`. Seed kullanıcılar `TeacherX2026!` şifresiyle (`CurrentState.md`).

---

## İş sırası ve bağımlılıklar

```
İş 1 (tip yenileme)  →  İş 2 (lead→sözleşme köprüsü)  →  İş 3+4 (pg_cron ikilisi)  →  İş 5 (dashboard)
```
Her iş ayrı branch + PR. İş 3 ve 4 aynı branch'te yapılabilir (ortak pg_cron kurulumu).

---

## İş 1 — `types/database.ts` yenileme + tipsiz client temizliği

**Neden:** Faz 1'de eklenen tablolar (`notifications`, `report_uploads`, `report_kurum_stats`) ve `contracts.expected_teacher_count` generated types'ta yok; kod tabanında bu yüzden tipsiz client'lar ve `as never/as any` cast'leri birikti. Büyümeden önce ödenecek borç.

**Adımlar:**
1. Tip üretimi. Tercihen: `npx supabase gen types typescript --project-id gttoevyxkpjhlxglsomd --schema public > types/database.ts` (Supabase CLI login ister; kullanıcıdan `npx supabase login` çalıştırmasını iste). CLI mümkün olmazsa `types/database.ts`'e elle ekle — dosyadaki mevcut desen: her tablo için explicit `Row/Insert/Update` + `Relationships: []` (teknik not: `Omit<...Row>` self-referans `never` üretir, bu desen bilinçli).
   - Eklenecekler: `notifications`, `report_uploads`, `report_kurum_stats` tabloları; `contracts.expected_teacher_count: number | null`; `lead_stage_enum`'a `ilk_gorusme | ihtiyac_analizi | teklif_istendi`.
2. Tipsiz client'ları typed'a çevir:
   - `components/notifications/notif-client.ts` → `createBrowserClient<Database>` kullan, `AppNotification` tipini generated Row'dan türet.
   - `components/reports/report-client.ts` → aynı şekilde.
   - `app/(dashboard)/raporlar/page.tsx` → `const sb = supabase as unknown as {...}` kaldır, normal typed sorgu.
   - `components/contracts/contract-form.tsx` → `payload as never` cast'lerini ve `(contract as {expected_teacher_count?...})` cast'ini kaldır.
   - `app/(dashboard)/okullar/page.tsx` → `sb` tipsiz erişimi kaldır.
3. `grep -rn "as never\|as any" app components` — sayı belirgin düşmeli (sıfır şart değil; eski modüllerdeki `as any`'lere dokunma, kapsam dışı).

**Kabul kriteri:** type-check + build temiz; rapor yükleme ve bildirim zili çalışmaya devam ediyor (regresyon yok).

---

## İş 2 — Kazanılan lead → sözleşme köprüsü

**Amaç:** Lead `kapandi_kazanildi` olduğunda satış→operasyon devri otomatik başlasın. Şu an kazanılan lead'de hiçbir şey tetiklenmiyor.

**Davranış:**
- Lead `kapandi_kazanildi` aşamasına geçince (INSERT veya UPDATE):
  1. Lead'in `school_id`'si doluysa → o okulu `status='aktif'` yap (zaten aktifse dokunma).
  2. Operasyon departmanındaki aktif üyelere fan-out bildirim: `type='sozlesme_hazirla'`, title "Sözleşme hazırlanacak", body lead/okul bilgisi, `entity_type='lead'`, `entity_id=lead.id`.
  3. `activities`'e olay (mevcut trigger'da aşama değişimi zaten yazılıyor — ekstra satır gerekmez).
- `school_id` NULL ise okul adımı atlanır, bildirim yine gider (operasyon okulu sonradan bağlar).

**Uygulama:** Mevcut `on_lead_stage_change()` fonksiyonunu `CREATE OR REPLACE` ile genişlet (yeni trigger ekleme — mevcut fonksiyonun güncel gövdesi `supabase/migrations/20260619000001_lead_teklif_workflow.sql`'de; oradaki fonksiyona yeni bir `IF NEW.stage = 'kapandi_kazanildi' THEN ... END IF;` bloğu ekle). **KRİTİK:** Bu yeni bloğu mevcut fonksiyondaki `IF changed THEN ... END IF;` guard'ının **içine** yaz (guard: `changed := (TG_OP = 'INSERT') OR (NEW.stage IS DISTINCT FROM OLD.stage)`). Guard'ın dışına konursa, zaten kazanılmış bir lead'in her sonraki UPDATE'inde okul-aktifleştirme + operasyon fan-out'u **tekrar tetiklenir** (mükerrer bildirim). SQL'i kullanıcıya ver + `supabase/migrations/2026MMDD000000_lead_kazanildi_koprusu.sql` olarak kaydet.

**UI:** Değişiklik gerekmez (zil `entity_type='lead'`i zaten `/leadler`e yönlendiriyor).

**Test senaryosu (kullanıcıyla):** satış kullanıcısı bir lead'i "Kazanıldı"ya çeker → operasyon zilinde "Sözleşme hazırlanacak" düşer; lead'in okulu varsa Okullar'da `aktif` olur.

**Kabul kriteri:** uçtan uca senaryo + SQL Editor'de `SELECT ... FROM notifications WHERE type='sozlesme_hazirla'` ile doğrulama.

---

## İş 3 — Sözleşme bitiş hatırlatması (pg_cron)

**Amaç:** Bitişine ≤30 gün kalan aktif sözleşmeler için operasyon+admin'e bildirim. (Sözleşmeler sayfasındaki mevcut sarı banner sadece sayfaya bakana görünüyor; bildirim proaktif olacak.)

**Uygulama (SQL — kullanıcı çalıştırır + migration olarak kaydet):**
1. `CREATE EXTENSION IF NOT EXISTS pg_cron;` (Supabase'de destekli; hata verirse Dashboard → Database → Extensions'tan açması için kullanıcıyı yönlendir).
2. Fonksiyon `notify_expiring_contracts()` (SECURITY DEFINER):
   - `contracts WHERE status='aktif' AND end_date BETWEEN current_date AND current_date + 30`
   - Mükerrer önleme: `AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.entity_type='contract' AND n.entity_id=c.id AND n.type='sozlesme_bitiyor')`
   - Alıcılar: `team_members WHERE is_active AND (role='admin' OR department='operasyon')`
   - Body'de okul adı + bitiş tarihi (`schools` join).
3. `SELECT cron.schedule('sozlesme-hatirlatma', '0 6 * * *', 'SELECT notify_expiring_contracts()');`
4. İlk çalıştırmayı elle tetikleyerek doğrula: `SELECT notify_expiring_contracts();`

**UI:** `notification-bell.tsx`'te `handleClick` şu an sadece `entity_type==='lead'`i yönlendiriyor — `'contract'` → `/sozlesmeler` yönlendirmesi ekle.

**Kabul kriteri:** 30 gün içinde biten test sözleşmesiyle elle tetikleme → bildirim düşer; ikinci tetiklemede mükerrer bildirim OLUŞMAZ.

---

## İş 4 — Geciken lead aksiyonu bildirimi (İş 3 ile aynı branch)

**Amaç:** `leads.next_action_date` geçmiş ve kapanmamış lead'ler için atanan satışçıya günlük hatırlatma. Şemadaki `reminder_sent` kolonu **tam bu iş için var ama hiç kullanılmıyor.**

**Uygulama (SQL):**
1. Fonksiyon `notify_overdue_leads()`:
   - `leads WHERE next_action_date < current_date AND reminder_sent = false AND stage NOT IN ('kapandi_kazanildi','kapandi_kaybedildi') AND assigned_to IS NOT NULL`
   - Her biri için `assigned_to`'ya bildirim (`type='geciken_aksiyon'`) + `UPDATE leads SET reminder_sent = true`.
2. Aynı cron'a ikinci job: `cron.schedule('geciken-lead', '0 6 * * *', ...)`.
3. **Sıfırlama:** `next_action_date` güncellenince `reminder_sent=false` olmalı — `leads` üzerine küçük bir `BEFORE UPDATE` trigger'ı: `IF NEW.next_action_date IS DISTINCT FROM OLD.next_action_date THEN NEW.reminder_sent := false; END IF;`

**Kabul kriteri:** geçmiş tarihli test lead'iyle elle tetikleme → satışçıya bildirim + `reminder_sent=true`; tarihi ileri alınca `reminder_sent` sıfırlanır.

---

## İş 5 — Dashboard'ı komuta merkezine çevirme

**Amaç:** `app/(dashboard)/dashboard/page.tsx` şu an 7 statik metrik kartı. "Bugün ne yapmalıyım" ekranı olacak.

**İçerik (server component, mevcut kart stiliyle):**
1. **"Benim İşlerim" bölümü** (giriş yapan kullanıcıya göre):
   - Bana atanan açık todo'lar (`todo_items WHERE assigned_to=me AND status='acik'`, bitiş tarihi geçenler kırmızı)
   - Bana atanan, aksiyonu geciken lead'ler
   - Okunmamış bildirim sayısı (zile link)
2. **Yaklaşanlar:** önümüzdeki 7 günün atamaları (`assignments`, scheduled_date); bitişine ≤30 gün kalan sözleşmeler (sadece admin+operasyon görür — sözleşme görünürlük kuralına uy).
3. **Pipeline özeti:** aşama başına lead sayısı + toplam değer (mevcut metriklerin gelişmişi).
4. **Son rapor KPI'sı:** en güncel `report_uploads` + `report_kurum_stats`'tan genel ortalama tamamlama & kurum sayısı; Raporlar'a link. Veri yoksa bölüm gizlenir. (Sadece admin+operasyon.)

**Dikkat:** RLS zaten kullanıcı bazlı filtreliyor; sorguları server client ile at, rol/departmanı `team_members`'tan oku (layout'taki desenle aynı). Recharts'a gerek yok — bu sayfa liste/sayı odaklı, hafif kalsın.

**Kabul kriteri:** satış kullanıcısı kendi lead/todo'larını görür, operasyon sözleşme+rapor bölümlerini görür, viewer sadece genel özet görür; build temiz.

---

## Backlog (bu planın kapsamı DIŞI — sıradaki planlamada değerlendirilecek)

- PoC'deki **drawer + auto-save** deseninin gerçek Lead formuna taşınması (`DECISIONS.md` 2026-06-19 kararı; PoC kodu `deneme/platform-foundation-poc` branch'inde)
- **Global arama** (Supabase FTS — PRD §'de `meetings.notes` tsvector planı var)
- `pf_records/pf_activities/pf_notifications` tablolarının buluttan DROP edilmesi (komutlar `supabase/migrations/20260619000000_pf_poc.sql` sonunda hazır — **bu dosya `main`'de değil, yalnızca `deneme/platform-foundation-poc` branch'inde**; oradan al — kullanıcı onayıyla)
- 81 okulun "Belirtilmedi" şehri için satır içi toplu düzenleme
- `computeStatsByKurum` (components/reports/report-client.ts) için birim test — saf fonksiyon, test altyapısının ilk adımı olarak ideal
- Rapor dönem karşılaştırması (aylık snapshot'lar birikince); e-posta bildirimi; atama takvim görünümü; rapor kurum adı ↔ okul elle eşleştirme ekranı

---

## Uygulama kontrol listesi (her iş için)

- [ ] `git fetch` + açık PR kontrolü, `main` güncel mi
- [ ] `main`'den feature branch
- [ ] DDL varsa: SQL bloğunu kullanıcıya ver → onun "çalıştırdım" onayını bekle → doğrulama sorgusuyla teyit et → migration dosyasını commit'e ekle
- [ ] `npm run type-check` + `npm run build` temiz
- [ ] Kullanıcıyla uçtan uca test (test kullanıcıları: `satis@` / `operasyon@` / `admin@teacherx.online`, şifre `TeacherX2026!`)
- [ ] `CurrentState.md` güncelle (Son İşlem + El Değiştirme Notu)
- [ ] Commit → push → PR aç → **merge etme**, linki kullanıcıya ver
