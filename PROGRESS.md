# PROGRESS — TeacherX CRM

> Her oturumun başında bu dosyayı oku. Her oturumun sonunda güncelle ve commit et.

## Şu Anki Durum

**Faz:** Faz 1 tamamlandı (10 modül canlı) · Faz 2 İş 1 ✅ · **Kurum Takip Panosu** devam ediyor (`PLAN_KURUM_TAKIP_PANOSU.md`, 9 adımın 7'si bitti)
**Son güncelleme:** 2026-09-09
**Deploy:** Vercel — çalışıyor (bir dönem push'ları almıyordu, düzeldi)
**Sağlık:** `npm run type-check` ✅ · `npm run build` ✅ · `npm run lint` ✅ (0 hata, 35 uyarı — hepsi kapsam dışı eski modüllerde)

### 🔴 ÖNCE OKU
- **Ortak canlı Supabase.** DDL anon/publishable anahtarla çalışmaz. Tüm şema değişiklikleri kullanıcıya **SQL bloğu** olarak verilir → Supabase **SQL Editor**'de çalıştırılır → aynı SQL `supabase/migrations/` altına tarih-önekli dosya olarak commit edilir.
- **Elle uygulanmış DB değişiklikleri + branch geçmişi:** `CurrentState.md` → "El Değiştirme Notu".
- **Sıradaki iş planı:** `PLAN_FOUNDATION_FAZ2.md` (5 iş) — başlamadan §0 "kritik bağlam"ı oku.
- **Git akışı:** `main`'den feature branch → commit → push → PR. **PR'ları sen merge etme**, ekip inceler.
- **PII:** `supabase/seed/` gerçek kurum/kişi verisi içerir, `.gitignore` kapsamındadır. Repoya girmemeli.
- **Server Component sınırı:** `"use client"` işaretli bir modülün fonksiyonunu **sunucuda çağırma** — import serbesttir ama çağrı `is not a function` ile patlar ve `type-check`/`build` bunu yakalamaz. Saf yardımcılar ayrı dosyada tutulur (`kesit-map.ts`, `kesit-trend.ts`). Canlıda yaşandı (PR #18).
- **Saat dilimi:** Tarih biçimlendirmede `timeZone` **daima** verilir (`TR_TZ`, `lib/utils.ts`). Vercel UTC, tarayıcı UTC+3 → hydration çöker. Canlıda yaşandı (PR #12).

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
| M10 Dashboard | `/dashboard`, `/raporlar` | metrik kartları; Raporlar → **Kurum Takip** (Kurum Karşılaştırma · Şube · Eğitim · Aylık Takip + markalı kurum raporu/PDF) |

### Platform Foundation — Faz 1 ✅
- `notifications` tablosu (polymorphic, RLS `recipient_id = auth.uid()`, Realtime) + header zili
- `leads` üzerinde `on_lead_stage_change` trigger'ı: `teklif_istendi` → operasyona fan-out, `teklif_verildi` → `assigned_to`'ya bildirim, her aşama `activities`'e yazılır
- Migration'lar: `20260619000001_lead_teklif_workflow.sql`, `20260619000002_rapor_dashboard.sql`, `20260619000003_rapor_v2_ozet.sql`

### Veri Aktarımı (2026-08-27) ✅
- 61 kurum (26-27 takip listesi), 69 eğitim + 56 eğitmen katalogu, 180 okul→eğitim ataması
- Dosyalar: `supabase/seed/*.sql` (gitignored, SQL Editor'den yüklenir)
- `20260827000000_trainings_default_trainer.sql` — `trainings.default_trainer_id` (seed'in DDL'i kayda geçirildi)

### Raporlar — İki Format (2026-09-08) ✅ *(sonradan Kurum Takip'e devredildi)*
- Platformdan iki döküm alınabiliyor: **kurs bazlı** (satır = öğretmen × eğitim) ve **öğretmen özeti** (satır = öğretmen). Format sütun başlıklarından otomatik anlaşılır.
- Excel tarayıcıda işlenir; DB'ye yalnızca kurum bazlı sayısal özet gider (ham satır asla yazılmaz)
- PDF çıktısı: `window.print()` + `@media print` (ek bağımlılık yok)
- Migration `20260908000000_rapor_format_ayrimi.sql` — `report_uploads.format`
- **Bu iki sekme 2026-09-09'da kaldırıldı**; Kurum Takip her iki formatı da okuyor.

### Raporlar — TeacherX Rapor Kimliği (2026-09-08) ✅
- Görünüm `kurum_raporu.py` örnek çıktılarına hizalandı; marka paleti + Poppins/Inter
- Grafikler saf SVG/CSS (`components/reports/brand.tsx`) — recharts kaldırıldı, sayfa 236 kB → 124 kB
- **İki ayrı PDF:** Kurum Raporu (isimsiz, kayıtlı özetten) · Öğretmen Listesi (isimli, yalnız oturum belleğinden)
- Gizlilik kuralı: `KULLANIM.md` — ikisi asla aynı çıktıya basılmaz

### Faz 2 İş 1 — Tip yenileme + tipsiz client temizliği (2026-09-09) ✅
- PR #11 çakışma yüzünden kapatıldı; güncel `main`'den temiz baştan yapıldı → **PR #16**
- `types/database.ts`: `report_uploads.format`, `trainings.default_trainer_id` eklendi (CLI yetkisi yok, elle)
- `notif-client.ts` paylaşılan typed client'a bağlandı; `okullar/page.tsx` ve `contract-form.tsx`'teki `as any` / `as never` / `as unknown as` kaldırıldı — kapsam dosyalarında **0 cast**

### Kurum Takip Panosu (2026-09-09) — 9 adımın 7'si ✅
Plan: `PLAN_KURUM_TAKIP_PANOSU.md`. Excel'deki 10 sayfalık takip panosunun CRM karşılığı.

**Saklama ilkesi:** girdinin kendisi değil, **üretilen çıktı** saklanır. Ad, soyad, e-posta ve kişi bazlı ilerleme hiçbir kolonda yok — `HamSatir` tipinde bile ad alanı yok, yani gizlilik yorum değil **tip düzeyinde** garanti.

| Adım | Ne | Durum |
|---|---|---|
| 1 | Hesaplama katmanı (`kesit.ts`) — iki formatı da okur | ✅ |
| 2 | Şema — `20260909000000_kesit_tablolari.sql`, 5 tablo | ✅ canlıda |
| 3 | Yükleme + kaydetme + kurum↔okul eşleştirme | ✅ PR #17 |
| 4 | Kurum Karşılaştırma sekmesi + Kurum Dağılımı grafiği | ✅ |
| 5 | Kurum Raporu (markalı, isimsiz, PDF) | ✅ |
| 6 | Şube ve Eğitim Analizi sekmeleri | ✅ |
| 7 | Aylık Takip — kesitler arası zaman serisi | ✅ PR #19 |
| 8 | "TÜMÜ" toplaması (kurum seçicisinde) | ⬜ sıradaki |
| 9 | Temizlik — `report_uploads` / `report_kurum_stats` DROP | ⬜ kod tarafı bitti, tablolar duruyor |

**Hesap kuralları (bozma):** kurum ortalaması **öğretmen düzeyinden** hesaplanır (şube ortalamalarının ortalaması değil); kurumlar arası toplam **öğretmen sayısıyla ağırlıklı**; Aylık Takip'te varsayılan **sabit sepet** (sonradan eklenen kurum toplamı aşağı çeker); bilinmeyen değer `null` kalır, 0 yazılmaz.

**Hotfix'ler:** PR #12 saat dilimi hydration · PR #18 Server Component sınırı · sekme değişiminde state kaybı · SVG `<title>` çok-çocuk hydration.

## Devam Eden

_Yok._

## Bilinen Blokerlar / Teknik Borç

| Konu | Detay | Nereye ait |
|---|---|---|
| 35 `any` cast | Eski modüllerde (egitmenler, toplantilar, egitimler, calisma-gruplari, ekip…). Faz 2 İş 1 kapsamı dışıydı, lint'te `warn` olarak izleniyor | Ayrı iş |
| API route yok | Tüm mutation'lar tarayıcıdan doğrudan Supabase'e; güvenlik tamamen RLS'e bağlı | Değerlendirilecek |
| Supabase CLI yetkisi | Giriş yapılan hesap `gttoevyxkpjhlxglsomd` projesine erişemiyor → `gen types` çalışmıyor, `types/database.ts` elle güncelleniyor | Kullanıcı aksiyonu |
| Service role key | `.env.local`'deki `SUPABASE_SERVICE_ROLE_KEY` aslında *publishable* bir anahtar (`sb_publishab…`). Uygulama kodu kullanmıyor, ama seed betikleri çalışmaz ve **yerelden üretim verisi okunamaz** — sorgular hata değil, boş dizi döner | Kullanıcı aksiyonu |
| Eski rapor tabloları | `report_uploads` / `report_kurum_stats` kodda artık kullanılmıyor ama DB'de duruyor. Adım 3 canlıda doğrulandı, `DROP TABLE` migration'ı yazılabilir | Kurum Takip Adım 9 |
| Kurum verisi boşlukları | Onboarding checklist genişletme, ürün/abonelik modeli, şehir zenginleştirme | `PLAN_KURUM_VERISI.md` (onay bekliyor) |

## Sonraki Adımlar

**Önce `PLAN_KURUM_TAKIP_PANOSU.md` bitirilecek:**
1. **Okul detay sayfası** — `/okullar/[id]` üzerinde o kurumun kesit verisi *(sıradaki)*
2. **Adım 8** — kurum seçicisine "TÜMÜ" (ağırlıklı toplam)
3. **Adım 9** — `report_uploads` / `report_kurum_stats` DROP migration'ı

**Sonra `PLAN_FOUNDATION_FAZ2.md`:**
1. ~~**İş 1** — `types/database.ts` yenileme + tipsiz client temizliği~~ ✅ 2026-09-09 (PR #16)
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
