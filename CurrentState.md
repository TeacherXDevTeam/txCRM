# TeacherX CRM — Mevcut Durum

> Her işlem sonunda güncellenir. Son güncelleme: 2026-07-13

### Son İşlem — Faz 2 Uygulama Planı (2026-07-13)
Sistem analizi yapıldı ve sıradaki 5 işin uygulama planı `PLAN_FOUNDATION_FAZ2.md` olarak kaydedildi (tip yenileme, kazanılan lead→sözleşme köprüsü, pg_cron hatırlatmaları, dashboard komuta merkezi + backlog). Plan, farklı bir AI oturumu tarafından bağımsız uygulanabilecek şekilde yazıldı. Ayrıca PR #6 (rapor Veriyi Temizle düzeltmesi) inceleme bekliyor.

---

## ⚠️ El Değiştirme Notu (2026-06-19) — ÖNCE BUNU OKU

**Devam eden işler `main`'de DEĞİL, ayrı feature branch'lerde.** `main`'i çekince bunları görmezsin:

| Branch | İçerik | Durum |
|--------|--------|-------|
| `feature/lead-teklif-akisi` | Lead "Teklif İstendi"→operasyon, "Teklif Verildi"→satışçı bildirimi; header zili (Realtime); inline kişi ekleme | ✅ main'e merge |
| `feature/okul-ziyaret-toplanti` | "Okul Ziyareti" türünde okul+koordinatör dropdown, okula polymorphic bağlama; okul detayı + "Çalıştığımız Okullar" sayfası | ✅ main'e merge |
| `feature/rapor-dashboard` | **Raporlar** menüsü: Excel (kurs-bazlı) yükleme → yükleme anında kuruma göre özetleme (JSONB) → kurum dropdown'lı dashboard (şube/kurs/bucket grafikleri, sözleşme karşılaştırması, risk listesi, veri temizleme). `xlsx`+`recharts` eklendi | PR'da |
| `deneme/platform-foundation-poc` | Platform Foundation PoC (`pf_` tabloları, `PLATFORM_FOUNDATION.md`) | Deneme |

### 🔴 Paylaşılan buluta ELLE uygulanan DB değişiklikleri (migration dosyaları branch'lerde)
Bunlar Supabase SQL Editor'den **canlı ortak DB'ye** uygulandı; `main`'deki migration dosyaları bunları YANSITMAZ:
- `lead_stage_enum`'a eklendi: `ilk_gorusme`, `ihtiyac_analizi`, `teklif_istendi` — *(UI/DB aşama uyumsuzluğu da düzeltildi)*
- Yeni tablo: **`notifications`** (polymorphic, kişi-bazlı, RLS: `recipient_id = auth.uid()`, Realtime açık)
- `leads` üzerinde **trigger** `on_lead_stage_change` (INSERT OR UPDATE): aşama → bildirim + activity
- `leads` RLS genişletildi: operasyon departmanı `teklif_istendi/verildi` aşamasındaki lead'leri görüp güncelleyebilir
- PoC tabloları: `pf_records`, `pf_activities`, `pf_notifications` (additive, deneme)
- **Rapor (rapor-dashboard branch):** `contracts.expected_teacher_count` kolonu; `report_uploads` tablosu; `report_kurum_stats` (kurum başına JSONB özet); eski `report_rows` DROP edildi. RLS: admin + operasyon. Migration: `20260619000002_*` ve `20260619000003_*`.

> Migration dosyaları: `supabase/migrations/20260619000001_lead_teklif_workflow.sql`, `20260619000002_rapor_dashboard.sql`, `20260619000003_rapor_v2_ozet.sql`, `20260619000000_pf_poc.sql` (deneme branch'inde).

### Mimari yön
Platform Foundation kararı için bkz. `DECISIONS.md` (2026-06-19) ve `PLATFORM_FOUNDATION.md`. Özet: status-driven + DB trigger, ilişkiler junction+FK, polymorphic yalnızca log/bildirim, UI'da wizard yerine drawer+auto-save.

---

## Tamamlanan İşler

### Faz 0 — Proje İskeleti ✅
- Next.js 14 (App Router, TypeScript strict) kurulumu
- Tailwind CSS v3 + shadcn/ui altyapısı
- Supabase SSR auth entegrasyonu (`@supabase/ssr`)
- Middleware (route koruması, login yönlendirme)
- Sidebar + Header layout bileşenleri (rol filtreli navigasyon)
- 6 seed kullanıcı (`npm run seed`): admin, satış×2, operasyon, eğitim, viewer
  - Şifre: `TeacherX2026!`
- Supabase migration dosyaları:
  - `20260617000000_initial_schema.sql` — 20+ tablo, enum'lar, triggerlar
  - `20260617000001_rls_policies.sql` — RLS politikaları, helper fonksiyonlar
- `types/database.ts` — Tüm tablolar için explicit Insert/Update/Relationships tipleri
  - Not: Supabase'in `GenericTable` tipi `Relationships: []` gerektiriyor
- Dashboard (M10): 7 metrik kartı (aktif okullar, pipeline, todolar, vs.)
- URL'ler ASCII: `/kisiler`, `/toplantilar`, `/sozlesmeler`, `/calisma-gruplari`

### Faz 0.5 — Demo Data + Kişiler ✅
- `npm run seed:data` — İdempotent demo data scripti
  - 10 kişi, 7 okul, 5 eğitim, 6 atama, 5 lead, 4 sözleşme, 2 toplantı + 5 todo
- **M0 Kişiler** (`/kisiler`):
  - Liste: isim/e-posta/kurum arama + tip filtresi (tablo)
  - Yeni kişi ekle / düzenle (modal)
  - Kişi sil
  - Detay sayfası (`/kisiler/:id`): iletişim bilgileri, okullar, eğitmen profili, lead geçmişi
- UI komponentleri: `Badge`, `Button`, `Input`, `Select` (components/ui/)

---

## Aktif Oturum

### Son İşlem — M8 Çalışma Grupları + M9 Ekip (2026-06-19)
M8 Çalışma Grupları: listeye tıklanınca sağda detay paneli açılan split-layout; detay panelinde Fazlar (satır içi durum güncelleme + faz ekleme), Üyeler (rol ile ekle/çıkar) ve Oturumlar (format, tarih, notlar) sekmeleri. M9 Ekip: admin paneli — kart görünümünde rol değiştirme dropdown'ı ve aktif/pasif toggle; sadece admin rolü bu kontrolleri görebiliyor.

### Son İşlem — M7 Sözleşmeler (2026-06-19)
M7 Sözleşmeler modülü tamamlandı: 30 gün içinde sona erecek aktif sözleşmeler için sarı uyarı banner'ı, sipariş kalemlerini (eğitim/birim fiyat/adet/indirim/toplam) gösteren expand/collapse kart görünümü, okul/durum/ödeme durumu filtreleri ve CRUD formu eklendi. Erişim kontrolü PRD'ye uygun: sadece admin ve operasyon rolü yazabilir.

### Son İşlem — M6 Eğitmenler (2026-06-19)
M6 Eğitmenler modülü tamamlandı: avatar baş harfleri, uzmanlık rozet etiketleri, e-posta/telefon linkleri ve yaklaşan atama özeti olan kart görünümü oluşturuldu. Forma predefined uzmanlık chip'leri + serbest alan ekleme özelliği eklendi; yeni eğitmen oluştururken sadece henüz eğitmen profili olmayan kişiler listeleniyor.

### Son İşlem — M5 Toplantılar (2026-06-19)
M5 Toplantılar modülü tamamlandı: Tiptap zengin metin editörü (bold/italic/başlık/liste toolbar'ı), katılımcı checkbox seçici, etiket ekleme/filtreleme ve kart expand/collapse yapısıyla toplantı notları görünümü oluşturuldu. Her kartın altında inline todo paneli var — kişiye atama, bitiş tarihi, tamamlandı olarak işaretleme ve gecikmeli todo kırmızı gösterimi mevcut.

### Son İşlem — M4 Atamalar (2026-06-18)
M4 Atamalar modülü tamamlandı: durum özet kartları (tıklanabilir filtre), gecikmeli atama uyarı banner'ı, okul/eğitim/kişi araması ile filtrelenebilir tablo, satır içi durum dropdown'ı ile anlık güncelleme ve CRUD formu (okul, eğitim, eğitmen, sorumlu, tarih, periyot alanları) eklendi.

### Son İşlem — M3 Eğitimler (2026-06-18)
M3 Eğitimler modülü tamamlandı: "Eğitim Kataloğu" ve "Paketler" sekme yapısıyla çalışan sayfa oluşturuldu. Katalog sekmesinde kategori/format/durum filtresi ile kart görünümü, Paketler sekmesinde checkbox tabanlı eğitim seçici içeren paket formu ve mevcut paketlerin detay kartları mevcut. Tüm CRUD işlemleri (ekle/düzenle/sil) canWrite rolüne bağlı, TypeScript sıfır hata.

### Son İşlem — M2 Leadler (2026-06-17)
M2 Leadler modülü tamamlandı: Kanban board (6 aktif aşama + kapandı kolonu) ve liste görünümü arasında geçiş yapılabiliyor. Her kartta aşama dropdown'ı ile anlık stage güncellemesi, yeni lead ekleme formu (kişi/aşama/kaynak/değer/tarih/atanan), pipeline özet metrikleri (aktif lead sayısı, toplam değer, kazanılan, geciken aksiyonlar) ve lead düzenleme/silme özellikleri eklendi.

### Son İşlem — M1 Okullar ✅
- **M1 Okullar** (`/okullar`):
  - Liste: isim/ilçe arama + durum/tip filtresi; üst summary kartlar (tıklanabilir filtre)
  - Yeni okul ekle / düzenle (modal form)
  - Okul sil (confirm dialog)
  - Detay sayfası (`/okullar/:id`): koordinatörler, atamalar, sözleşmeler, aktiviteler, onboarding progress bar

---

## Sonraki Adımlar

| Öncelik | Modül | Notlar |
|---------|-------|--------|
| P0 | M2 Leadler | Kanban board, pipeline görünümü |
| P0 | M3 Eğitimler | Katalog, paket yönetimi |
| P0 | M4 Atamalar | Takvim, durum takibi |
| P1 | M5 Toplantılar | Tiptap editor, todo listesi |
| P1 | M6 Eğitmenler | Profil, uzmanlık filtresi |
| P1 | M7 Sözleşmeler | Admin+operasyon görünümü |

---

## Teknik Notlar

- **Login sorun geçmişi**: `handle_user_login()` trigger'ı EXCEPTION handler gerektiriyordu. SQL editor'de manuel fix yapıldı.
- **TypeScript tip sorunu**: `Omit<Database[...][Row]>` self-referans → `never` döndürüyor. Fix: explicit `Insert`/`Update` tipleri + `Relationships: []`.
- **Node versiyonu**: `nvm use 20` gerekiyor (proje Node 20.20.2).
- **Seed script**: `node supabase/seed.mjs` (kullanıcılar) → `node supabase/seed-data.mjs` (demo data). İkisi ayrı.

---

### Son İşlem — Lead Teklif Akışı + Bildirim (2026-06-19)
Lead "Teklif İstendi" aşamasına geçince operasyon ekibine, "Teklif Verildi"ye geçince atanan satışçıya otomatik bildirim düşüyor (DB trigger + `notifications` tablosu + header zili, Realtime). `lead_stage_enum`'a `ilk_gorusme/ihtiyac_analizi/teklif_istendi` eklendi, UI/DB aşama uyumsuzluğu giderildi; operasyona teklif aşaması lead'leri için RLS açıldı. `feature/lead-teklif-akisi` branch'i. (Migration: `20260619000001_lead_teklif_workflow.sql`)
