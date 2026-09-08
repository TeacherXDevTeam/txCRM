# PROGRESS — TeacherX CRM

> Her oturumun başında bu dosyayı oku. Her oturumun sonunda güncelle ve commit et.

## Şu Anki Durum

**Faz:** Faz 1 tamamlandı (10 modül canlı) → **Faz 2 (Platform Foundation) uygulanmayı bekliyor**
**Son güncelleme:** 2026-09-08
**Deploy:** Vercel — çalışıyor
**Sağlık:** `npm run type-check` ✅ · `npm run build` ✅ · `npm run lint` ✅ (0 hata, 36 uyarı)

### 🔴 ÖNCE OKU
- **Ortak canlı Supabase.** DDL anon/publishable anahtarla çalışmaz. Tüm şema değişiklikleri kullanıcıya **SQL bloğu** olarak verilir → Supabase **SQL Editor**'de çalıştırılır → aynı SQL `supabase/migrations/` altına tarih-önekli dosya olarak commit edilir.
- **Elle uygulanmış DB değişiklikleri + branch geçmişi:** `CurrentState.md` → "El Değiştirme Notu".
- **Sıradaki iş planı:** `PLAN_FOUNDATION_FAZ2.md` (5 iş) — başlamadan §0 "kritik bağlam"ı oku.
- **Git akışı:** `main`'den feature branch → commit → push → PR. **PR'ları sen merge etme**, ekip inceler.
- **PII:** `supabase/seed/` gerçek kurum/kişi verisi içerir, `.gitignore` kapsamındadır. Repoya girmemeli.

## Tamamlanan İş

### Faz 0 — İskelet ✅
- Next.js 14 (App Router, TS strict) + Tailwind v3 + shadcn/ui + Supabase SSR auth + middleware
- `20260617000000_initial_schema.sql` (20+ tablo) · `20260617000001_rls_policies.sql`
- 6 seed kullanıcı (`npm run seed`, şifre `TeacherX2026!`) + demo data (`npm run seed:data`)

### Faz 1 — Modüller ✅ (hepsi canlı)
| Modül | Rota | Not |
|---|---|---|
| M0 Kişiler | `/kisiler`, `/kisiler/[id]` | CRUD, tip filtresi, detay |
| M1 Okullar | `/okullar`, `/okullar/[id]`, `/okullar/calistigimiz` | onboarding progress, koordinatör, completeness |
| M2 Leadler | `/leadler` | Kanban + liste, teklif akışı, bildirim |
| M3 Eğitimler | `/egitimler` | Katalog + Paketler sekmeleri |
| M4 Atamalar | `/atamalar` | durum kartları, gecikme uyarısı |
| M5 Toplantılar | `/toplantilar` | Tiptap editör, todo paneli, etiket |
| M6 Eğitmenler | `/egitmenler` | uzmanlık chip'leri, atama özeti |
| M7 Sözleşmeler | `/sozlesmeler` | sipariş kalemleri, bitiş uyarısı |
| M8 Çalışma Grupları | `/calisma-gruplari` | split-layout: fazlar/üyeler/oturumlar |
| M9 Ekip | `/ekip` | admin: rol + aktiflik yönetimi |
| M10 Dashboard | `/dashboard`, `/raporlar` | metrik kartları; Excel yükleme + kurum bazlı rapor |

### Platform Foundation — Faz 1 ✅
- `notifications` tablosu (polymorphic, RLS `recipient_id = auth.uid()`, Realtime) + header zili
- `leads` üzerinde `on_lead_stage_change` trigger'ı: `teklif_istendi` → operasyona fan-out, `teklif_verildi` → `assigned_to`'ya bildirim, her aşama `activities`'e yazılır
- Migration'lar: `20260619000001_lead_teklif_workflow.sql`, `20260619000002_rapor_dashboard.sql`, `20260619000003_rapor_v2_ozet.sql`

### Veri Aktarımı (2026-08-27) ✅
- 61 kurum (26-27 takip listesi), 69 eğitim + 56 eğitmen katalogu, 180 okul→eğitim ataması
- Dosyalar: `supabase/seed/*.sql` (gitignored, SQL Editor'den yüklenir)
- `20260827000000_trainings_default_trainer.sql` — `trainings.default_trainer_id` (seed'in DDL'i kayda geçirildi)

## Devam Eden

_Yok._

## Bilinen Blokerlar / Teknik Borç

| Konu | Detay | Nereye ait |
|---|---|---|
| `types/database.ts` eksik | `notifications`, `report_uploads`, `report_kurum_stats`, `contracts.expected_teacher_count`, yeni `lead_stage_enum` değerleri generated types'ta yok | Faz 2 İş 1 |
| 36 `any`/`as never` cast | Yukarıdaki tip eksikliğinin sonucu. Lint'te `warn` olarak izleniyor | Faz 2 İş 1 |
| API route yok | Tüm mutation'lar tarayıcıdan doğrudan Supabase'e; güvenlik tamamen RLS'e bağlı | Değerlendirilecek |
| Service role key | `.env.local`'deki `SUPABASE_SERVICE_ROLE_KEY` aslında *publishable* anahtar → script tabanlı insert/DDL çalışmıyor | Kullanıcı aksiyonu |
| Kurum verisi boşlukları | Onboarding checklist genişletme, ürün/abonelik modeli, şehir zenginleştirme | `PLAN_KURUM_VERISI.md` (onay bekliyor) |

## Sonraki Adımlar

**`PLAN_FOUNDATION_FAZ2.md` sırasıyla:**
1. **İş 1** — `types/database.ts` yenileme + tipsiz client temizliği *(sıradaki)*
2. **İş 2** — Kazanılan lead → sözleşme köprüsü (trigger + fan-out bildirim)
3. **İş 3+4** — Sözleşme bitiş & lead durgunluk hatırlatma cron'ları (pg_cron)
4. **İş 5** — Dashboard

**Sonra:** `PLAN_KURUM_VERISI.md` İş A → B → C (onay sonrası)

## Teknik Notlar

- **Node:** 20.20.2 (`nvm use 20`).
- **ESLint:** `eslint@8` + `eslint-config-next@14.2.35` — Next 14 ile hizalı. ESLint 9 / config-next 16'ya yükseltmek flat config (`eslint.config.mjs`) geçişi gerektirir.
- **Login geçmişi:** `handle_user_login()` trigger'ı EXCEPTION handler gerektiriyordu, SQL Editor'de elle düzeltildi.
- **TypeScript deseni:** `Omit<Database[...][Row]>` self-referans → `never`. Fix: explicit `Insert`/`Update` tipleri + `Relationships: []`. Bilinçli desen, bozma.
- **Seed sırası:** `node supabase/seed.mjs` (kullanıcılar) → `node supabase/seed-data.mjs` (demo data). Gerçek veri için `supabase/seed/` SQL'leri: kurumlar → katalog → atamalar.
