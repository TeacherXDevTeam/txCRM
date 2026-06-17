# TeacherX CRM — Mevcut Durum

> Her işlem sonunda güncellenir. Son güncelleme: 2026-06-17

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
