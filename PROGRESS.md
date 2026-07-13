# PROGRESS — TeacherX CRM

> Her oturumun başında bu dosyayı oku. Her oturumun sonunda güncelle ve commit et.

> 🔴 **2026-06-19 — ÖNCE OKU:** Devam eden işler ayrı feature branch'lerde ve ortak buluta elle uygulanmış DB değişiklikleri var. Detay + branch listesi + DB değişiklikleri: **`CurrentState.md` → "El Değiştirme Notu"**. Mimari karar: `DECISIONS.md` (Platform Foundation).

> 🟢 **2026-07-13 — SIRADAKI İŞ PLANI HAZIR:** Faz 2 uygulama planı **`PLAN_FOUNDATION_FAZ2.md`** dosyasında (5 iş: tip yenileme, lead→sözleşme köprüsü, sözleşme/lead hatırlatma cron'ları, dashboard). Uygulamaya başlamadan önce o dosyayı ve içindeki "kritik bağlam" bölümünü oku.

## Şu Anki Durum

**Faz:** Faz 1 — Modüller tamamlandı; Platform Foundation (iş akışı katmanı) başladı  
**Son güncelleme:** 2026-06-19  
**Aktif özellik:** Lead teklif akışı + bildirim, okul ziyareti ↔ okul eşleme (feature branch'lerde)

## Tamamlanan İş

- [x] PRD v0.2 oluşturuldu (`teacherx_crm_prd.md`)
- [x] CLAUDE.md, ETHOS.md, AGENTS.md oluşturuldu
- [x] PROGRESS.md, DECISIONS.md, features.json oluşturuldu
- [x] **Faz 0 tamamlandı:** Next.js 14 + TypeScript + Tailwind + App Router kurulumu
- [x] Tüm bağımlılıklar kuruldu (Supabase, Radix UI, lucide-react, clsx, vb.)
- [x] Proje klasör yapısı oluşturuldu (app/, components/, lib/, types/, supabase/)
- [x] 2 Supabase migration dosyası: tüm tablolar + RLS politikaları
- [x] `types/database.ts` placeholder (Supabase bağlanınca üretilecek)
- [x] Auth: middleware, login sayfası, LoginForm component
- [x] Dashboard: protected layout (Sidebar + Header), M10 dashboard metrikleri
- [x] `npm run type-check` — sıfır hata ✓

## Devam Eden

_Yok._

## Bilinen Blokerlar

- **Supabase credentials eksik:** `.env.local` dosyasındaki `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` değerleri doldurulmalı
- Değerler doldurulduktan sonra `npx supabase db push` ile schema uygulanacak
- Sonra `npx supabase gen types typescript --local > types/database.ts` ile gerçek tipler üretilecek

## Sonraki Adımlar

**Hemen yapılması gerekenler:**
1. Supabase projesi oluştur (supabase.com/dashboard)
2. `.env.local` değerlerini doldur
3. `npx supabase db push` — iki migration'ı uygula
4. `npx supabase gen types typescript --local > types/database.ts` — tipleri üret
5. `npm run dev` — uygulamayı test et

**Faz 1 — Core Varlıklar (sıradaki):**
- M0 Contact: liste, detay, CRUD, CSV import, duplicate detection
- M1 Okul: liste, detay, koordinatör, activity log, onboarding progress bar
- M6 Eğitmen: profil, uzmanlık filtresi, atama geçmişi

## Faz Özeti

| Faz | Durum | Kapsam |
|-----|-------|--------|
| Faz 0 — Kurulum | Bekliyor | Supabase schema, RLS, auth, Next.js scaffolding, M9 |
| Faz 1 — Core Varlıklar | Bekliyor | M0 Contact, M1 Okul, M6 Eğitmen |
| Faz 2 — Eğitim & Ticari | Bekliyor | M3 Katalog, M7 Sözleşme, M4 Atama |
| Faz 3 — Satış | Bekliyor | M2 Lead Kanban |
| Faz 4 — Bilgi Yönetimi | Bekliyor | M5 Toplantı, M8 Working Group |
| Faz 5 — Cila & Launch | Bekliyor | M10 Dashboard, testler, deploy |
