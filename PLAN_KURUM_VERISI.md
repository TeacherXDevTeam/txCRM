# PLAN — Kurum Takip Verisi Entegrasyonu (Özellik Boşlukları)

> **Kaynak:** "26-27 Kurum Takip Listesi" Excel'i (61 kurum) CRM'e aktarılırken şemada karşılığı olmayan alanlar tespit edildi. Uyan alanlar `supabase/seed/26-27-kurumlar.sql` ile seed edildi. Bu doküman, **uymayan alanları modellemek için** gereken 3 özelliği tanımlar.
> **Hazırlayan:** Claude — 2026-08-27. Onay bekliyor.

---

## 0. Bağlam (ÖNCE OKU)

- **Ortak canlı DB:** DDL anon/publishable anahtarla çalışmaz. Tüm şema değişiklikleri kullanıcıya **SQL bloğu** olarak verilir → kullanıcı **Supabase SQL Editor**'de çalıştırır → aynı SQL `supabase/migrations/` altına tarih-önekli dosya olarak commit edilir. (Bkz. `PLAN_FOUNDATION_FAZ2.md §0`.)
- **Not:** `.env.local` içindeki `SUPABASE_SERVICE_ROLE_KEY` şu an bir *publishable* anahtar; script tabanlı insert/DDL çalışmaz. Düzeltilene kadar tüm veri/DDL işlemleri SQL Editor üzerinden yürür.
- **Öncelik sırası:** İş A (checklist) en yüksek değer/en düşük risk → İş B (ürünler) → İş C (şehir zenginleştirme, saf veri).

---

## İş A — Genişletilmiş Onboarding Checklist

**Neden:** Excel'deki operasyonel takip alanları mevcut 5 sabit `onboarding_milestone_key_enum` değerine sığmıyor ve şu an sadece `schools.notes` içinde metin olarak duruyor — **filtrelenemiyor, raporlanamıyor, panoda gösterilemiyor.**

**Kapsanmayan alanlar (Excel → dağılım):**
| Excel sütunu | Dolu |
|---|---|
| Sosyal medya paylaşımı | 42 ✓ |
| MailChimp maili atıldı | 7 ✓ |
| Öğretmen listesi durumu | 18 Geldi + 4 Entegrasyon |
| Eğitim listesi durumu | 21 ✓ |
| Eğitim ataması | 7 ✓ |
| Başlangıç bilgilendirme maili | 58 Atıldı |
| Öğrenci listesi | muhtelif |

**Karar noktası — iki seçenek:**

- **A1 (önerilen) — Enum genişletme.** Mevcut `onboarding_milestones` tablosu aynen kullanılır; enum'a yeni key'ler eklenir. Basit, mevcut UI'ya uyumlu, her adım "tamamlandı/tamamlanmadı" ikilisi.
  ```sql
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'sosyal_medya_paylasildi';
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'mailchimp_maili_atildi';
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'ogretmen_listesi_geldi';
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'egitim_listesi_geldi';
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'egitim_atamasi_yapildi';
  ALTER TYPE onboarding_milestone_key_enum ADD VALUE IF NOT EXISTS 'bilgilendirme_maili_atildi';
  -- NOT: ADD VALUE ayrı bir işlem olmalı; aynı transaction içinde yeni değeri kullanamazsın.
  ```
  - "Öğretmen listesi = Entegrasyon" gibi 3. durumlar ikiliye sığmaz → ilgili milestone `completed_at` NULL bırakılıp açıklama `schools.notes`'ta tutulur (kabul edilebilir kayıp).

- **A2 — Esnek checklist tablosu.** Durumların çok-değerli (Geldi / Entegrasyon / Beklemede) olabildiği düşünülürse:
  ```sql
  CREATE TABLE school_checklist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    item_key   TEXT NOT NULL,          -- 'ogretmen_listesi'
    status     TEXT NOT NULL DEFAULT 'beklemede', -- beklemede|tamamlandi|entegrasyon|iptal
    value      TEXT,                   -- serbest not (ör. "60 öğrenci - 6.7. sınıf")
    updated_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, item_key)
  );
  -- RLS: authenticated read; write admin+operasyon (mevcut milestone politikası deseniyle).
  ```
  Daha esnek ama yeni UI + RLS + tip üretimi gerektirir.

**UI:** Okul detay sayfasındaki mevcut "Profil Tamamlama / Onboarding" paneline yeni adımlar/işaret kutuları eklenir (A1'de otomatik, A2'de yeni bileşen).

**Kabul kriteri:** Bir kurumun checklist'i UI'dan işaretlenebiliyor; Dashboard'da "onboarding'i eksik kurumlar" filtrelenebiliyor; type-check + build temiz.

---

## İş B — Kurum Ürünleri / Abonelik Modeli

**Neden:** Excel'de her kurumun kullandığı ürün var (`Ürün 1` / `Ürün 2`): **TeacherX (48), StudentX (10), Entegrasyon**. CRM'de "kurum hangi ürüne sahip" kavramı **yok** — bu, raporlama ve yenileme takibi için temel bir eksik.

**Uygulama (SQL — SQL Editor + migration):**
```sql
CREATE TYPE product_enum AS ENUM ('teacherx', 'studentx', 'entegrasyon');

CREATE TABLE school_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product    product_enum NOT NULL,
  status     TEXT NOT NULL DEFAULT 'aktif',   -- aktif|deneme|iptal
  started_on DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, product)
);
-- RLS: authenticated read; write admin+operasyon.
ALTER TABLE school_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY sp_read ON school_products FOR SELECT TO authenticated USING (true);
CREATE POLICY sp_write ON school_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members t WHERE t.id = auth.uid()
                 AND (t.role='admin' OR t.department='operasyon')))
  WITH CHECK (EXISTS (SELECT 1 FROM team_members t WHERE t.id = auth.uid()
                 AND (t.role='admin' OR t.department='operasyon')));
```

**Veri taşıma:** Seed'de ürünler şu an `schools.notes`'taki `[26-27 Takip] Ürün1: ... | Ürün2: ...` bloğunda. Tablo kurulunca notlardan `school_products`'a taşıyan bir tek-seferlik `INSERT ... SELECT` yazılır (kullanıcı onayıyla).

**UI:** Okul detayında "Ürünler" rozet/etiket satırı; Dashboard'da ürün bazlı kurum sayısı.

**Kabul kriteri:** Kurumlara ürün eklenip listelenebiliyor; Dashboard'da "TeacherX kullanan X kurum" gösterilebiliyor.

---

## İş C — Şehir/İlçe Veri Zenginleştirme

**Neden:** Excel'de şehir hiç yok. Seed'de 10 kurum isimden çıkarıldı (İzmir, Bursa, Sakarya, Trabzon, Girne, İstanbul/Tuzla/Maltepe); kalan **51 kurum `city='Belirtilmedi'`**.

**Uygulama:** Kod/şema gerektirmez. İki yol:
1. Okullar sayfasına **satır içi şehir düzenleme** (backlog'da zaten var — `PLAN_FOUNDATION_FAZ2.md`).
2. Ekipten şehir listesi alınıp tek `UPDATE schools SET city=... WHERE name=...` bloğu.

**Kabul kriteri:** `SELECT count(*) FROM schools WHERE city='Belirtilmedi'` belirgin düşer.

---

## Uygulama sırası ve bağımlılıklar

```
İş A (checklist)  →  İş B (ürünler + not→tablo taşıma)  →  İş C (şehir, bağımsız)
```
Her iş ayrı branch + PR. A ve B DDL içerir → SQL Editor + migration kaydı. C saf veri.

## Kontrol listesi (her iş)
- [ ] DDL → SQL bloğu kullanıcıya → "çalıştırdım" onayı → doğrulama sorgusu → migration dosyası commit
- [ ] `npx supabase gen types` veya `types/database.ts` elle güncelle (yeni tablo/enum)
- [ ] `npm run type-check` + `npm run build` temiz
- [ ] `CurrentState.md` "Son İşlem" + El Değiştirme Notu güncelle
- [ ] Commit → push → PR (merge etme)
