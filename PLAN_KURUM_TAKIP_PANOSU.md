# PLAN — Kurum Eğitim Takip Panosu (CRM)

> **Kaynak:** `TeacherX_Kurum_Egitim_Takip_Panosu.xlsx` (10 sayfa). CRM karşılığı bu plana göre kurulacak.
> **Hazırlayan:** Claude — 2026-09-08 (v2, kullanıcı yönlendirmesiyle yeniden yazıldı).

---

## 0. Temel ilke — ne saklanır, ne saklanmaz

**Saklanan: yalnızca üretilen çıktı.** Excel yüklendiğinde tarayıcıda hesaplanan kurum/şube/eğitim düzeyindeki **sayılar** kaydedilir. Bir kesit şu soruya cevap verir:

> *"8 Eylül 2026'da ALKEV'de kaç öğretmen vardı, ortalaması neydi, kaç eğitim atanmıştı?"*

**Saklanmayan: girdinin kendisi.** Ad, soyad, e-posta, kişi bazlı ilerleme — hiçbiri sunucuya gitmez, hiçbir tabloda durmaz, hiçbir rapora girmez.

Bunun üç sonucu var:

1. `KULLANIM.md`'deki gizlilik taahhüdü yapısal olarak garanti altına alınır — isim saklanmadığı için sızması mümkün değil.
2. Mevcut **risk listesi kaldırılır** (ekrandan ve koddan). Şu an isimleri gösteriyor.
3. Mevcut **"Öğretmen Listesi (PDF)"** çıktısı kaldırılır. Kullanıcı bu bilgiye ihtiyaç duymadığını belirtti; kişi bazlı takip gerekirse kaynak Excel'den bakılır.

---

## 1. Yeni yapı — neden JSONB'den vazgeçiliyor

Bugün özetler `report_kurum_stats.stats` içinde tek bir JSONB blob olarak duruyor. Bu yapı iki somut sorun üretti:

- **Şema kayması çöktürüyor.** Eski kayıtlarda olmayan bir alan okununca sayfa "Application error" veriyor — bu üretimde yaşandı (`Cannot read properties of undefined (reading 'length')`).
- **Sorgulanamıyor.** "Tüm kurumları ortalamaya göre sırala" ya da "ALKEV'in son 6 ayı" gibi bir soru JSONB içinden SQL ile cevaplanamıyor; tüm bloblar çekilip JavaScript'te açılıyor.

Yeni yapı **gerçek kolonlar** kullanır. Sorgu SQL'e iner, eksik alan diye bir şey olmaz, kurumlar arası karşılaştırma ve zaman serisi doğrudan veritabanından gelir.

### 1.1 Tablolar

```sql
-- Bir Excel yüklemesi = bir KESİT
create table report_kesit (
  id             uuid primary key default gen_random_uuid(),
  kesit_tarihi   date        not null,          -- verinin ait olduğu gün
  dosya_adi      text,
  kaynak_satir   integer     not null default 0,-- Excel'de kaç satır vardı (denetim izi)
  yukleyen       uuid        references team_members(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (kesit_tarihi)                          -- gün başına tek kesit; yeniden yükleme üzerine yazar
);

-- KESİT × KURUM  — panonun ana tablosu
create table report_kurum (
  id                    uuid primary key default gen_random_uuid(),
  kesit_id              uuid not null references report_kesit(id) on delete cascade,
  kurum_adi             text not null,
  school_id             uuid references schools(id) on delete set null,

  ogretmen_sayisi       integer not null default 0,
  sube_sayisi           integer not null default 0,
  egitim_sayisi         integer,                     -- NULL = özet dökümde bilinmiyor
  kayit_sayisi          integer not null default 0,  -- öğretmen × eğitim satır adedi

  ilerleme_ortalamasi   numeric(5,2) not null default 0,  -- %; kısmi ilerleme SAYILIR
  tamamlanma_orani      numeric(5,2) not null default 0,  -- %; kısmi SAYILMAZ
  tamamlanan_egitim     integer not null default 0,

  sertifika_sayisi      integer,                          -- NULL = özet dökümde bilinmiyor
  sertifika_alan        integer,                          -- en az 1 sertifikası olan öğretmen

  hic_baslamayan        integer not null default 0,
  devam_eden            integer not null default 0,
  tumunu_tamamlayan     integer not null default 0,

  esitsiz_atama         integer not null default 0,       -- bkz. §2
  kaynak                text not null default 'detayli'
                        check (kaynak in ('detayli','ozet')),  -- bkz. §4
  created_at            timestamptz not null default now(),
  unique (kesit_id, kurum_adi)
);

-- KESİT × KURUM × ŞUBE
create table report_sube (
  id                  uuid primary key default gen_random_uuid(),
  kurum_id            uuid not null references report_kurum(id) on delete cascade,
  sube_adi            text not null,
  ogretmen_sayisi     integer not null default 0,
  egitim_sayisi       integer,                          -- NULL = özet dökümde bilinmiyor
  ilerleme_ortalamasi numeric(5,2) not null default 0,
  tamamlanma_orani    numeric(5,2) not null default 0,
  sertifika_sayisi    integer,                          -- NULL = özet dökümde bilinmiyor
  hic_baslamayan      integer not null default 0,
  devam_eden          integer not null default 0,
  tumunu_tamamlayan   integer not null default 0,
  unique (kurum_id, sube_adi)
);

-- KESİT × KURUM × EĞİTİM
create table report_egitim (
  id                 uuid primary key default gen_random_uuid(),
  kurum_id           uuid not null references report_kurum(id) on delete cascade,
  egitim_adi         text not null,
  atanan_ogretmen    integer not null default 0,
  tamamlayan         integer not null default 0,
  tamamlanma_orani   numeric(5,2) not null default 0,
  hic_baslamayan     integer not null default 0,
  sertifika_sayisi   integer not null default 0,
  unique (kurum_id, egitim_adi)
);

-- Kümülatif sertifika eğrisi — Sertifika Tarihi'nden aylık histogram (kişisel veri yok)
create table report_sertifika_ay (
  id       uuid primary key default gen_random_uuid(),
  kurum_id uuid not null references report_kurum(id) on delete cascade,
  ay       date not null,      -- ayın 1'i
  adet     integer not null default 0,
  unique (kurum_id, ay)
);
```

**Kurum ↔ okul köprüsü.** `school_id` doğrudan `report_kurum` üzerinde. İlk yüklemede ada göre otomatik eşleşir; eşleşmeyenler ekranda "eşleştirme bekliyor" listesine düşer, kullanıcı dropdown'dan seçer. Eşleştirme bir kez yapılır ve sonraki kesitlere ada göre taşınır. Bu köprü kurulunca rapor verisi sözleşme, atama, lead ve toplantı verisiyle aynı okul üzerinden birleşir.

**NULL kullanımı bilinçli.** Özet dökümde üretilemeyen alanlar sıfır değil `NULL` tutulur — "sertifika yok" ile "sertifika bilgisi yok" farklı şeylerdir ve ortalama alırken karıştırılmamalıdır. `kaynak` kolonu kesitin hangi dökümden geldiğini söyler.

**RLS:** beş tabloda da mevcut desen — `get_my_role() = 'admin' OR department = 'operasyon'`.

### 1.2 Eski tabloların akıbeti

`report_uploads`, `report_kurum_stats` — yeni akış çalıştığı doğrulandıktan sonra kaldırılır. Aradaki geçişte ikisi yan yana durur; eski Raporlar sekmesi eski tablolardan okumaya devam eder. Veri taşınmaz (kesitler yeniden yüklenerek oluşur).

---

## 2. Metrik tanımları — tek hakikat

"Ortalama" bugün üç yerde üç farklı şey demek. İki metrik ayrı isimlerle tanımlanır ve **her ikisi de her zaman gösterilir**:

| Ad | Tanım | Kısmi ilerleme |
|---|---|---|
| **İlerleme Ortalaması** | Her öğretmenin kendi eğitimlerindeki ilerleme ortalaması → bunların ortalaması | **sayılır** |
| **Tamamlanma Oranı** | Her öğretmenin `tamamladığı ÷ atanan`ı → bunların ortalaması | sayılmaz |

Belirsiz `avgCompletion` adı tamamen kaldırılır.

**İkisi de öğretmen düzeyinden hesaplanır** — önce kişi, sonra ortalama. Sebebi `KULLANIM.md`'de: kurum ortalaması şube ortalamalarının ortalaması değildir, yoksa küçük bir şube sonucu orantısız sürükler. Bu, kuruma giden `kurum_raporu.py` raporuyla CRM ekranının **aynı sayıyı** göstermesini de garanti eder.

> **Excel'den küçük bir sapma:** Excel'in "Genel Ortalama"sı satır düzeyinde ortalıyor. Öğretmenlere eşit sayıda eğitim atanmışsa iki sonuç birebir aynı; atama eşitsizse ayrışır. Bu yüzden `esitsiz_atama` sayısı da saklanır ve ekranda uyarı olarak gösterilir — sayı ayrıştığında sebebi görünür olur.

Diğer tanımlar (`KULLANIM.md`'den, değişmeden):

- **Öğretmen sayısı** = benzersiz e-posta. Ad-soyad kimlik değildir.
- **Hiç başlamayan** = atanan eğitimlerin tamamında ilerleme %0
- **Devam eden** = başlamış, hepsini bitirmemiş
- **Tümünü tamamlayan** = atananların tamamı %100

---

## 3. Adım adım yapılacaklar

Her adım ayrı branch + PR. Sıra bağımlılığa göre; her adım kendi başına çalışır durumda bırakır.

### Adım 1 — Hesaplama katmanı

`components/reports/` altında yeni bir modül: Excel satırlarından **kesit çıktısını** üretir.

- Girdi: `Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi`
- Çıktı: kurum listesi + her kurum için şube/eğitim/sertifika-ay kırılımları — §1.1'deki kolonlara birebir karşılık gelen düz nesneler
- Kimlik e-posta; ad-soyad **çıktıya hiç girmez**
- Mükerrer (aynı öğretmen + aynı eğitim) satırlar birleştirilir, en yüksek ilerleme tutulur; birleştirilen adet raporlanır
- `İlerleme (%)` ölçeği doğrulanır (0–1 mi 0–100 mü), belirsizse yükleme durdurulur

**Doğrulama:** elle hesaplanabilir sentetik veriyle birim kontrolleri (mevcut 22 kontrolün yerini alır). Kaynak Excel'in GEN Koleji sayfasındaki sayılarla karşılaştırma — 120 öğretmen / 4 şube / 7 eğitim / %52,07 genel ortalama.

### Adım 2 — Şema

§1.1'deki `CREATE TABLE` bloğu + RLS politikaları kullanıcıya SQL olarak verilir, SQL Editor'de çalıştırılır, `supabase/migrations/` altına commit edilir. `types/database.ts` elle güncellenir (CLI yetkisi yok).

### Adım 3 — Yükleme akışı

- Excel seçilir → tarayıcıda Adım 1 çalışır → **önizleme**: kaç kurum, kaç öğretmen, kaç eğitim, hangi kurumlar okulla eşleşmedi
- "Kaydet" → yalnızca sayılar yazılır (kesit + kurum + şube + eğitim + sertifika-ay)
- Aynı `kesit_tarihi` varsa üzerine yazılır (cascade siler, yeniden yazar) — kullanıcı onaylar
- Ham satırlar bellekte kalır, kaydedilmez; sayfa yenilenince gider

**Bu adımda kaldırılanlar:** risk listesi, "Öğretmen Listesi (PDF)" butonu ve `teacher-list-view.tsx`.

### Adım 4 — Kurum Karşılaştırma sekmesi

Excel'in en çok kullanılan sayfası. Tüm kurumlar tek tabloda, sıralanabilir:

`Kurum · Öğretmen · Şube · Eğitim · İlerleme Ort. · Tamamlanma Oranı · Sertifika · Sertifika Alan · Hiç Başlamayan · Tümünü Tamamlayan · Sözleşme Kapsamı`

Tek SQL sorgusu; sıralama ve renk skalası TeacherX kimliğinde. PDF'e basılabilir. Sözleşme kapsamı `school_id` üzerinden `contracts.expected_teacher_count` ile gelir.

### Adım 5 — Kurum Raporu sekmesi (mevcut panonun yeniden bağlanması)

Bugünkü markalı kurum raporu yeni tablolardan okur. KPI'lar: Öğretmen · Atanan Eğitim · İlerleme Ortalaması · Tamamlanma Oranı · Sertifika · üç grup + halka + şube barları + eğitim tablosu. Risk listesi yok.

### Adım 6 — Şube ve Eğitim Analizi sekmeleri

Tüm kurumların şubeleri / eğitimleri tek tabloda, kurum filtresiyle. "Hiç Başlamayan %" sütununda renk skalası ters (yüksek = kırmızı).

### Adım 7 — Aylık Takip sekmesi ✅ (2026-09-09)

**Excel'de bu sayfa her ay elle kopyala-yapıştır gerektiriyor. CRM'de bedava** — her kesit zaten tarihli. Yapılacak tek şey tüm kesitleri çekip zaman serisi çizmek:

```sql
select k.kesit_tarihi, r.kurum_adi, r.ogretmen_sayisi,
       r.ilerleme_ortalamasi, r.tamamlanma_orani, r.sertifika_sayisi
from report_kurum r join report_kesit k on k.id = r.kesit_id
where r.kurum_adi = $1
order by k.kesit_tarihi;
```

Kümülatif sertifika eğrisi `report_sertifika_ay`'dan gelir ve kayıt tutmaya başlamadan önceki geçmişi de gösterir.

### Adım 8 — "TÜMÜ" toplaması

Kurum seçicisine "TÜMÜ" eklenir. Toplama **kurum ortalamalarının ortalaması değil**, öğretmen sayısıyla ağırlıklı olur — §2'deki kuralın gereği.

### Adım 9 — Temizlik

**Kod tarafı 2026-09-09'da yapıldı:** eski "Öğretmen Özeti" ve "Kurs Bazlı" sekmeleri ve onlara bağlı 9 dosya kaldırıldı; Raporlar sayfası tek işe (Kurum Takip) indi. Kurum Takip iki formatı da okuduğu için işlev kaybı yok, aynı veriyi farklı hesapla gösteren ikinci bir ekran da kalmadı.

**Tablolar henüz DURUYOR.** `report_uploads` / `report_kurum_stats` silinmedi — Adım 3 (kaydetme) çalıştığı doğrulanana kadar veri kaybı riski alınmıyor. Sonra ayrı bir `DROP TABLE` migration'ı ile kaldırılacak. "Veriyi Temizle" yerine iki ayrı işlem gelir: **bu kesiti sil** (varsayılan) ve **tüm geçmişi sil** (ayrı onay) — yoksa tek tıkla aylık trend kaybedilir.

---

## 4. İki döküm formatı da kabul edilir

Platformdan iki ayrı döküm alınabiliyor; kesit modeli ikisini de aynı yapıya yazar. Yüklenen dosyanın hangisi olduğu **sütun başlıklarından otomatik anlaşılır**; kullanıcının bir şey seçmesi gerekmez.

| Format | Sütunlar | Üretilebilenler |
|---|---|---|
| **Detaylı** (satır = öğretmen × eğitim) | `Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi` | Hepsi |
| **Özet** (satır = öğretmen) | `Adı Soyadı · E-posta · Kurum · Şube · Tamamlanan · Devam Eden · Tamamlama %` | Eğitim kırılımı, sertifika metrikleri ve kümülatif eğri **hariç** hepsi |

Üretilemeyen alanlar `null` olarak saklanır ve ekranda **"—"** gösterilir; sıfır yazılmaz, uydurulmaz. Kurum detayında sebebi açıklayan bir not çıkar.

Aynı sayfada her iki formatın sütunları da varsa detaylı olan seçilir (daha zengin). Aynı kesit tarihine iki farklı format yüklenirse ikincisi birincinin üzerine yazar.

Dosya tek bir sayfadan da ibaret olabilir, çok sayfalı bir çalışma kitabı da olabilir: **gerekli sütunları taşıyan ilk sayfa** bulunup kullanılır (takip panosunda "Ham Veri" dokuzuncu sayfadır).

---

## 5. Kapsam dışı

- **Öğretmen Listesi ve Öğretmen Detayı** — kişi bazlı bilgi saklanmayacağı için CRM'e girmiyor. Gerekirse kaynak Excel'den bakılır.
- Risk listesi (isimli) — kaldırılıyor.
- Excel çıktısı üretme — çıktı formatı PDF.
- Excel'in renk skalalarının birebir taklidi — TeacherX kimliğindeki eşdeğerleri kullanılacak.

---

## 6. Açık nokta

**Kesit tarihi ne olacak?** İki seçenek: (a) yükleme günü otomatik, (b) kullanıcı elle girer. Excel'in `Sertifika Tarihi` dışında zaman bilgisi olmadığı için veri "yüklendiği güne" ait sayılıyor. Ay ortasında iki kez yüklenirse `unique (kesit_tarihi)` ikincisini üzerine yazar — aylık seride tek nokta kalır. Kullanıcı geçmişe dönük bir döküm yüklemek isterse (b) gerekir.

**Öneri:** varsayılan yükleme günü, ama düzenlenebilir bir alan olarak gösterilsin. Uygulamada (b), pratikte (a).
