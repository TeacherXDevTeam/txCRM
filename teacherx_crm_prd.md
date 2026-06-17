# TeacherX CRM — Product Requirements Document
**Versiyon:** v0.2 | **Tarih:** Haziran 2026 | **Durum:** Taslak  
**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL) + Vercel

---

## İçindekiler
1. [Giriş ve Amaç](#1-giriş-ve-amaç)
2. [Modül Haritası](#2-modül-haritası)
3. [Modül Gereksinimleri](#3-modül-gereksinimleri)
4. [Veritabanı Şeması](#4-veritabanı-şeması)
5. [Teknik Mimari](#5-teknik-mimari)
6. [İzin Matrisi](#6-izin-matrisi)
7. [Roadmap](#7-roadmap)
8. [Kapsam Dışı (P2/P3)](#8-kapsam-dışı)

---

## 1. Giriş ve Amaç

TeacherX; okul ortaklıkları, eğitim programları, satış süreçleri, toplantı yönetimi ve eğitmen takibini şu anda farklı araçlarda (e-posta, spreadsheet, notlar) yönetmektedir. Bu CRM tüm operasyonel süreçleri tek platformda birleştirir.

**Hedef kullanıcılar:** TeacherX iç ekip üyeleri (operasyon, satış, içerik, eğitim)

**Başarı kriterleri:**
- Tüm aktif okul ve koordinatör bilgileri tek platformda erişilebilir
- Satış pipeline'ı görsel olarak takip edilebilir
- Toplantı notlarına full-text arama ile ulaşılabilir, todo oluşturulabilir
- Eğitim atama ve tamamlanma durumları anlık izlenebilir
- Working group faz ve üye takibi yapılabilir
- MVP 8-10 hafta içinde production'a alınabilir

---

## 2. Modül Haritası

| Modül | Ad | Öncelik | Notlar |
|-------|----|---------|--------|
| M0 | Contact (Merkezi Kişi) | P0 | Tüm modüllerin ortak kişi kaynağı |
| M1 | Okul Yönetimi | P0 | Activity log + onboarding milestone |
| M2 | Lead & Satış Takibi | P0 | Kanban pipeline + activity log + reminder |
| M3 | Eğitim Kataloğu | P0 | Eğitimler, paketler |
| M4 | Atama & Takip | P0 | Periyodik durum, gecikme uyarısı |
| M5 | Toplantı Notları & Todo | P1 | Full-text arama, polimorfik ilişki, etiket |
| M6 | Eğitmen Yönetimi | P1 | Profil, atama geçmişi |
| M7 | Sözleşme & Sipariş | P1 | Ticari boyut, ödeme durumu |
| M8 | Working Group | P1 | Faz takibi, üyelik, oturumlar |
| M9 | Ekip & Rol Yönetimi | P1 | Kullanıcılar, roller, audit trail |
| M10 | Raporlama & Dashboard | P2 | Metrikler, CSV export |

---

## 3. Modül Gereksinimleri

### M0 — Contact (Merkezi Kişi)

Aynı kişi birden fazla modülde (okul koordinatörü, lead, toplantı, working group) tekrar girilmesini önler. Tüm modüller bu tabloyu referans alır.

**Alanlar:**
```
id, full_name, email (unique), phone, title, organization
contact_type: okul_koordinatoru | egitmen | partner | potansiyel | diger
notes, created_at, updated_at
linked_school_id (FK → schools, opsiyonel)
```

**İlişkiler:**
- Contact → Coordinator (okul koordinatörü olarak)
- Contact → Lead (iletişim kurulmuş kişi)
- Contact ↔ Meeting (M2M, katılımcı)
- Contact ↔ WorkingGroup (M2M, üye)
- Contact → Trainer (1:1, eğitmen profili)

**Özellikler:**
1. Global kişi arama (isim, e-posta, kurum)
2. Kişi detay sayfası: tüm ilişkili kayıtlar tek sayfada (okullar, toplantılar, WG, leadler)
3. Duplicate detection: aynı e-posta ile ikinci kayıt engellensin
4. CSV toplu içe aktarım

---

### M1 — Okul Yönetimi

**School alanları:**
```
id, name, city, district
school_type: devlet | ozel | vakif
status: aktif | pasif | potansiyel
partnership_start_date, notes
created_at, updated_at
```

**Coordinator alanları:**
```
id, school_id (FK → schools), contact_id (FK → contacts)
is_primary (boolean)
notes, created_at
```

**Activity Log alanları:**
```
id, school_id (FK), contact_id (FK, opsiyonel), created_by (FK → team_members)
activity_type: telefon | eposta | toplanti | ziyaret | not
summary (kısa), details (uzun metin), activity_date
```

**Onboarding Milestones** (sabit liste, her okul için tamamlanma takibi):
```
- sozlesme_imzalandi
- koordinator_girildi
- egitim_paketi_belirlendi
- acilis_toplantisi_yapildi
- certifiX_hesabi_olusturuldu
```

**Özellikler:**
1. Okul listesi: şehir, tip, status filtresi + arama
2. Okul detay sayfası: koordinatörler, atamalar, sözleşme, activity log, onboarding progress bar
3. Lead → Okul dönüşüm akışı (lead bilgileri ön dolu gelir)
4. CSV toplu içe aktarım

---

### M2 — Lead & Satış Takibi

**Lead alanları:**
```
id, contact_id (FK → contacts)
school_id (FK → schools, opsiyonel — dönüşüm sonrası dolar)
stage: yeni_baglanti | teklif_iletildi | gorusme_yapildi | teklif_verildi | kapandi_kazanildi | kapandi_kaybedildi
assigned_to (FK → team_members)
source: referans | etkinlik | soguk_arama | web | diger
estimated_value (TL)
next_action_date, reminder_sent (boolean)
notes, created_at, updated_at
```

**Activity Log:** M1 ile aynı yapı, `lead_id` FK ile.

**Özellikler:**
1. Kanban board: stage sütunları, sürükle-bırak
2. Lead detay: iletişim geçmişi (activity log), stage değişiklik logu
3. Reminder: `next_action_date` geçmiş + tamamlanmamış → ana sayfada uyarı
4. Dönüşüm: "Okula Dönüştür" aksiyonu, lead `kapandi_kazanildi` olur, okul oluşturulur
5. Basit dönüşüm istatistikleri

---

### M3 — Eğitim Kataloğu

**Training alanları:**
```
id, title, description
category: yapay_zeka | olumlu_okul_iklimi | etkili_ogretmenlik | diger
format: yuz_yuze | cevrimici | hibrit
duration_hours, status: aktif | pasif | gelistirme
```

**Package alanları:**
```
id, name, description, status: aktif | pasif
```

**Bağlantı tablosu:** `package_trainings (package_id, training_id)`

**Özellikler:**
1. Eğitim listesi: kategori, format, status filtresi
2. Paket görünümü: pakete dahil eğitimler
3. Eğitime atanmış eğitmenler

---

### M4 — Atama & Takip

**Assignment alanları:**
```
id, school_id (FK), training_id (FK), trainer_id (FK, opsiyonel)
assigned_to (FK → team_members)
status: planlanmis | devam_ediyor | tamamlandi | iptal
scheduled_date, completed_date
period (opsiyonel: "2026-Q3" gibi etiket)
notes, completion_notes
created_at, updated_at
```

**Özellikler:**
1. Okul başına eğitim durumu dashboard'u
2. Takvim görünümü (planlanan eğitimler)
3. Gecikme uyarısı: `scheduled_date` geçmiş + status `planlanmis` → kırmızı işaret + bildirim
4. Haftalık geciken atamalar özet görünümü
5. Toplu atama: bir eğitimi birden fazla okula aynı anda ata
6. Periyodik atama takibi (Q1/Q2/Q3/Q4 veya özel)

---

### M5 — Toplantı Notları & Todo

**Meeting alanları:**
```
id, title, meeting_date
meeting_type: core_group | ekip | okul_ziyareti | wg_oturumu | diger
attendees (contact FK dizisi — M2M: meeting_contacts)
notes (zengin metin / markdown)
related_entity_type: school | lead | working_group | trainer | diger (opsiyonel)
related_entity_id (opsiyonel)
tags (text dizisi)
created_by (FK → team_members), created_at
```

**TodoItem alanları:**
```
id, meeting_id (FK → meetings)
text, assigned_to (FK → team_members)
due_date, status: acik | tamamlandi
created_at
```

**Özellikler:**
1. Zengin metin editörü (Tiptap veya Lexical — markdown desteği şart)
2. Full-text arama: tüm toplantı notlarında içerik araması (`pg_trgm` veya `tsvector`)
3. Toplantı notundan todo oluşturma (metinden seçip "Todo Ekle")
4. Todo listesi: kişiye, tarihe, toplantıya göre filtreli
5. Etiket sistemi: serbest tag ekleme + filtreleme
6. Bağlam ilişkisi: "Kadıköy Anadolu Lisesi ile ilgili tüm toplantılar" sorgulanabilir

---

### M6 — Eğitmen Yönetimi

**Trainer alanları:**
```
id, contact_id (FK → contacts)
expertise_areas (text dizisi)
status: aktif | pasif
bio (uzun metin)
```

**Özellikler:**
1. Eğitmen listesi + detay profili
2. Eğitmen başına atama geçmişi
3. Uzmanlık alanına göre filtreleme
4. Yaklaşan eğitimler görünümü

---

### M7 — Sözleşme & Sipariş

**Contract alanları:**
```
id, school_id (FK → schools), package_id (FK → packages, opsiyonel)
created_by (FK → team_members)
start_date, end_date, auto_renew (boolean)
contract_value (TL)
payment_status: odeme_bekleniyor | kismi | tamamlandi
status: aktif | suresi_doldu | iptal
notes
```

**Order alanları:**
```
id, contract_id (FK → contracts), training_id (FK → trainings)
unit_price (TL), quantity, discount_rate
```

**Özellikler:**
1. Okul sayfasında aktif sözleşme özeti
2. Süresi dolacak sözleşme uyarısı (30 gün öncesi)
3. Toplam değer ve ödeme durumu görünümü
4. Paket yerine tekil eğitim satışı da modellenebilir (Order üzerinden)

---

### M8 — Working Group

**WorkingGroup alanları:**
```
id, name, description
status: aktif | tamamlandi | beklemede
start_date, end_date (opsiyonel)
current_phase (text)
```

**WGMember alanları:**
```
id, working_group_id (FK), contact_id (FK)
role: kolaylastirici | katilimci | gozlemci
school_id (FK, opsiyonel)
joined_at, left_at (opsiyonel)
```

**WGSession alanları:**
```
id, working_group_id (FK)
session_date, title
format: yuz_yuze | cevrimici | hibrit
notes, attendee_ids (contact FK dizisi)
meeting_id (FK → meetings, opsiyonel)
```

**WGPhase alanları:**
```
id, working_group_id (FK)
phase_number, name, description
start_date, end_date
status: planlandi | devam_ediyor | tamamlandi
```

**Özellikler:**
1. Working group listesi ve detay sayfası
2. Faz zaman çizelgesi görünümü
3. Üye listesi: kurum ve role göre filtre
4. Oturumlar: tarihe göre sıralı, not desteği
5. WG oturumu ↔ M5 toplantı notu ilişkilendirmesi

---

### M9 — Ekip & Rol Yönetimi

**TeamMember alanları:**
```
id, email (unique), full_name, avatar_url
role: admin | member | viewer
department: satis | operasyon | icerik | egitim
is_active (boolean), last_login
```

**Özellikler:**
1. Davet sistemi: Kullanıcılar, admin tarafından önceden oluşturulacak.
2. Rol değiştirme (admin only)
3. Audit trail: kim, ne zaman, hangi kaydı değiştirdi

---

### M10 — Raporlama & Dashboard

**Dashboard metrikleri:**

| Metrik | Hesaplama |
|--------|-----------|
| Aktif okul sayısı | `status = aktif` olan School kayıtları |
| Bu ay tamamlanan eğitimler | Assignment: `completed_date` bu ay |
| Pipeline değeri (TL) | Lead: `stage NOT IN (kapandi_*)` → `estimated_value` toplamı |
| Lead dönüşüm oranı | `kazanildi / (kazanildi + kaybedildi)` |
| Açık todo'larım | TodoItem: `status = acik AND assigned_to = me` |
| Geciken atamalar | Assignment: `scheduled_date < now AND status != tamamlandi` |
| Süresi dolacak sözleşmeler | Contract: `end_date < now + 30 days` |

**P2 Raporlar:**
- Okul bazlı eğitim tamamlanma raporu (CSV export)
- Eğitmen yük raporu
- Pipeline funnel raporu
- Working group katılım raporu

---

## 4. Veritabanı Şeması

```
contacts
  id, full_name, email (unique), phone, title, organization
  contact_type, linked_school_id, notes, created_at, updated_at

schools
  id, name, city, district, school_type, status
  partnership_start_date, notes, created_at, updated_at

coordinators
  id, school_id → schools, contact_id → contacts
  is_primary, notes, created_at

onboarding_milestones
  id, school_id → schools
  milestone_key, completed_at, completed_by → team_members

activities
  id, school_id → schools (nullable), lead_id → leads (nullable)
  contact_id → contacts (nullable), created_by → team_members
  activity_type, summary, details, activity_date

leads
  id, contact_id → contacts, school_id → schools (nullable)
  stage, assigned_to → team_members, source
  estimated_value, next_action_date, reminder_sent
  notes, created_at, updated_at

trainings
  id, title, description, category, format
  duration_hours, status

packages
  id, name, description, status

package_trainings  [junction]
  package_id → packages, training_id → trainings

trainers
  id, contact_id → contacts
  expertise_areas[], status, bio

assignments
  id, school_id → schools, training_id → trainings
  trainer_id → trainers (nullable), assigned_to → team_members
  status, scheduled_date, completed_date, period
  notes, completion_notes, created_at, updated_at

contracts
  id, school_id → schools, package_id → packages (nullable)
  created_by → team_members
  start_date, end_date, auto_renew
  contract_value, payment_status, status, notes

orders
  id, contract_id → contracts, training_id → trainings
  unit_price, quantity, discount_rate

meetings
  id, title, meeting_date, meeting_type
  notes (markdown), related_entity_type, related_entity_id
  tags[], created_by → team_members, created_at

meeting_contacts  [junction]
  meeting_id → meetings, contact_id → contacts

todo_items
  id, meeting_id → meetings, text
  assigned_to → team_members, due_date, status, created_at

working_groups
  id, name, description, status
  start_date, end_date, current_phase

wg_members
  id, working_group_id → working_groups, contact_id → contacts
  role, school_id → schools (nullable), joined_at, left_at

wg_sessions
  id, working_group_id → working_groups
  session_date, title, format, notes
  attendee_ids[], meeting_id → meetings (nullable)

wg_phases
  id, working_group_id → working_groups
  phase_number, name, description
  start_date, end_date, status

team_members
  id, email (unique), full_name, avatar_url
  role, department, is_active, last_login
```

---

## 5. Teknik Mimari

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| Frontend | Next.js 14 (App Router) | SSR, iyi DX, Vercel uyumu |
| UI | Tailwind CSS + shadcn/ui | Hızlı prototipleme, erişilebilir |
| Backend | Next.js API Routes veya tRPC | Tek repo, type-safe |
| Veritabanı | Supabase (PostgreSQL) | RLS, realtime, kolay auth |
| Auth | Supabase Auth | Email/şifre (seed data ile) |
| Rich Text | Tiptap | Markdown desteği, todo entegrasyonu |
| Arama | Supabase FTS (`pg_trgm` / `tsvector`) | Ek servis gerektirmez |
| Deployment | Vercel | Next.js için optimize |

**RLS Stratejisi:**
- Tüm tablolarda RLS aktif
- `team_members` tablosu üzerinden rol kontrolü
- Leadler: sadece `assigned_to` ve admin görebilir
- Sözleşmeler: sadece admin ve operasyon

**Full-Text Arama:**
- `meetings.notes` üzerinde `tsvector` index
- Türkçe için `simple` config (stemming olmadan, MVP için yeterli)
- Scale gerekirse → Algolia veya Typesense (P3)

---

## 6. İzin Matrisi

| Modül | Admin | Member | Viewer |
|-------|-------|--------|--------|
| Okullar | Tam | Tam | Sadece okuma |
| Leadler | Tam | Kendi atananlar | Yok |
| Sözleşmeler | Tam | Sadece okuma | Yok |
| Atamalar | Tam | Tam | Sadece okuma |
| Toplantı Notları | Tam | Tam | Sadece okuma |
| Working Groups | Tam | Tam | Sadece okuma |
| Eğitmenler | Tam | Tam | Sadece okuma |
| Ekip Yönetimi | Tam | Yok | Yok |
| Raporlar | Tam | Sadece okuma | Yok |

---

## 7. Roadmap

| Faz | Süre | Kapsam |
|-----|------|--------|
| Faz 0 — Kurulum | 1 hafta | Supabase schema (tüm tablolar), RLS, auth, Next.js scaffolding, M9 rol sistemi |
| Faz 1 — Core Varlıklar | 2 hafta | M0 Contact, M1 Okul + Koordinatör + Activity + Onboarding, M6 Eğitmen |
| Faz 2 — Eğitim & Ticari | 2 hafta | M3 Katalog + Paketler, M7 Sözleşme & Sipariş, M4 Atama + Reminder |
| Faz 3 — Satış | 1 hafta | M2 Lead Kanban + Activity Log + Reminder + Dönüşüm akışı |
| Faz 4 — Bilgi Yönetimi | 2 hafta | M5 Toplantı + Todo + FTS + Etiket, M8 Working Group |
| Faz 5 — Cila & Launch | 1 hafta | M10 Dashboard, testler, production deploy, CSV importlar |

**Toplam tahmini süre:** 9-10 hafta

---

## 8. Kapsam Dışı

Aşağıdakiler MVP'ye dahil değil; sonraki fazlarda değerlendirilebilir:

- Belge / dosya yönetimi (attachment sistemi)
- Toplantı notlarından AI ile otomatik özet ve todo çıkarımı
- E-posta entegrasyonu (Gmail / Outlook)
- CertifiX sertifika durumu senkronizasyonu
- Mobil uygulama
- Okul koordinatörlerine özel dış portal
- WhatsApp / SMS bildirim entegrasyonu
- Gelişmiş BI dashboard
- Muhasebe / faturalama entegrasyonu
- Öğrenci takibi (ayrı ürün kapsamı)

---

*TeacherX CRM PRD v0.2 — Haziran 2026*  
*Öğretmen Gelişir, Toplum Değişir.*
