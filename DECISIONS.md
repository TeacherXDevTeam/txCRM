# DECISIONS — TeacherX CRM

Mimari kararlar, gerekçeleri ve reddedilen alternatifler. Kompaksiyon sırasında "neden" kaybolur — bu dosya korur.

---

## 2026-06-17 — Stack Seçimi

**Karar:** Next.js 14 App Router + Supabase + Tailwind + shadcn/ui + Tiptap

**Gerekçe:**
- Next.js App Router: SSR + Server Components = az client JS, iyi SEO (dahili araç ama yine de önemli)
- Supabase: RLS built-in → permission matrix (PRD §6) doğrudan DB katmanında uygulanır; ayrıca Auth, Realtime, FTS tek pakette
- shadcn/ui: Copy-paste komponentler, tam kontrol, Radix UI erişilebilirliği; bir UI kütüphanesi kilitlenmesi yok
- Tiptap: M5 için Markdown + todo entegrasyonu, ProseMirror tabanlı → stabil

**Reddedilenler:**
- Prisma ORM: Supabase'in generated types'ı + supabase-js yeterli; fazladan katman gereksiz
- React Query: Next.js 14 Server Components fetch pattern'ı kapsıyor; MVP için overkill
- tRPC: API Routes yeterli başlangıç için; ölçek gerektirirse eklenebilir

---

## 2026-06-17 — Kimlik Doğrulama Stratejisi

**Karar:** Supabase Auth (email/şifre), invite-only (admin kullanıcı oluşturur)

**Gerekçe:** TeacherX dahili araç, public kayıt yok. Admin panelinden davet akışı yeterli. OAuth gereksiz karmaşıklık ekler.

**Reddedilenler:**
- NextAuth.js: Supabase Auth ile çakışan auth katmanı; tek çözüm tercih edildi
- Magic link: Kullanıcı deneyimi tercihinden dolayı şifre tabanlı seçildi

---

## 2026-06-17 — RLS Stratejisi

**Karar:** Tüm tablolarda RLS aktif, `team_members` tablosu üzerinden rol kontrolü

**Gerekçe:** PRD §5 ve §6 net bir permission matrix tanımlıyor. RLS'yi DB katmanında tutmak, API katmanındaki güvenlik açıklarını önler. `auth.uid()` → `team_members.id` join ile rol doğrulaması yapılır.

**Kritik kurallar:**
- Leadler: sadece `assigned_to` ve admin
- Sözleşmeler: sadece admin ve operasyon departmanı

---

## 2026-06-17 — Full-Text Arama

**Karar:** Supabase FTS (`tsvector` + `pg_trgm`), Türkçe için `simple` config

**Gerekçe:** M5 toplantı notlarında arama için ek servis (Algolia, Typesense) gerekmez. `simple` config stemming yapmaz — Türkçe morfojisi için MVP'de güvenli.

**Reddedilenler:**
- Algolia: Ek maliyet + latency; MVP için Supabase FTS yeterli
- Elasticsearch: Operasyonel yük fazla

**Notlar:** Ölçek gerekirse Algolia veya Typesense (PRD §8 P3 kapsam).

---

<!-- Yeni karar eklerken formatı koru:
## YYYY-MM-DD — Konu

**Karar:** ...
**Gerekçe:** ...
**Reddedilenler:** ...
-->
