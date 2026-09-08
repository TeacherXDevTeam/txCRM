# PLAN — Kurum Eğitim Takip Panosu (CRM)

> **Kaynak:** `TeacherX_Kurum_Egitim_Takip_Panosu.xlsx` (10 sayfa, 10.000 satır kapasiteli Excel panosu; örnek veri GEN Koleji + ALKEV + BİLNET). Kullanıcı bu panonun CRM içindeki karşılığını istiyor: ham tamamlama raporu CRM'e yüklenecek, kurumlar arası ilişkili veri Supabase'de tutulacak.
> **Hazırlayan:** Claude — 2026-09-08. **Onay bekliyor** — §2 ve §6'daki karar noktaları çözülmeden koda başlanmamalı.

---

## 0. Bağlam (ÖNCE OKU)

- **Ortak canlı Supabase.** DDL anon anahtarla çalışmaz; şema değişiklikleri kullanıcıya SQL bloğu olarak verilir, SQL Editor'de çalıştırılır, aynı SQL `supabase/migrations/` altına commit edilir.
- **Supabase CLI yetkisi yok.** Giriş yapılan hesap `gttoevyxkpjhlxglsomd` projesine erişemiyor → `gen types` çalışmıyor, `types/database.ts` elle güncelleniyor.
- **Vercel** projesi `crmtx`; Git bağlantısı bir dönem kopuktu, deploy sonrası yayındaki sürümün doğrulanması gerekir.
- **Gizlilik taahhüdü:** `KULLANIM.md` (kurum_raporu.py paketi) — *kurum raporu isim içermez, öğretmen listesi ayrı belgedir, ikisi birlikte paylaşılmaz.* Bu plan §6'da doğrudan bu kuralla çarpışıyor.
- Mevcut Raporlar modülü: `report_uploads` + `report_kurum_stats` (kurum başına JSONB özet). **Ham satırlar bilinçli olarak saklanmıyor.**

---

## 1. Excel ne yapıyor → CRM'de karşılığı

| Excel sayfası | Ne veriyor | CRM'de durum |
|---|---|---|
| **Ham Veri** | `Ad · Soyad · E-posta · Kurum · Şube · Eğitim · İlerleme (%) · Sertifika Tarihi` — tüm kurumlar alt alta | ✅ Aynı format "Kurs Bazlı" sekmesinde okunuyor |
| **Pano** | Tek kurum (veya TÜMÜ) için 8 KPI + şube grafiği + eğitim grafiği + şube durum kırılımı + kümülatif sertifika eğrisi | 🟡 KPI'ların çoğu var; TÜMÜ toplaması ve sertifika eğrisi yok |
| **Kurum Karşılaştırma** | Kurumları yan yana sıralayan tablo (12 sütun, performansa göre sıra) | ❌ Yok — en büyük eksik |
| **Şube Analizi** | Tüm kurumların şubeleri tek tabloda; Hiç Başlamayan %, Devam Eden dahil | 🟡 Kurum içi şube var, kurumlar arası yok |
| **Eğitim Analizi** | Eğitim bazında atanan/tamamlayan/hiç başlamayan/sertifika | 🟡 Kurum içi var, kurumlar arası yok |
| **Aylık Takip** | Aydan aya kurum ortalaması + kümülatif sertifika. **Excel'de elle kopyala-yapıştır ritüeli gerektiriyor** | ❌ Yok — ama CRM'de **bedava** (§5) |
| **Öğretmen Listesi** | Her öğretmen tek satır: atanan/ortalama/tamamladığı/sertifika/durum | ❌ Ham satır gerektirir (§6) |
| **Öğretmen Detayı** | Tek öğretmenin eğitim eğitim dökümü | ❌ Ham satır gerektirir (§6) |
| **Listeler / Kılavuz** | Açılır liste kaynakları, tanımlar | — CRM'de gereksiz |

**Excel'in kapasitesi:** 25 kurum · 60 şube · 30 eğitim · 1000 öğretmen · 400 aylık kayıt. CRM'de bu sınırlar kalkar (mevcut veri zaten 92 kurum).

---

## 2. 🔴 KARAR 1 — "Ortalama" üç ayrı şey demek

Şu an üç yerde üç farklı tanım var ve **hepsi "ortalama" diye anılıyor:**

| Kaynak | Tanım | Kısmi ilerleme |
|---|---|---|
| **Excel — Genel Ortalama** | Tüm (öğretmen × eğitim) satırlarının ilerleme yüzdesi ortalaması | **Sayılır** |
| **Excel — Tamamlanma Oranı** | Tamamlanan (%100) eğitim ÷ atanan eğitim | Sayılmaz |
| **CRM — `avgCompletion`** | Önce her öğretmenin `tamamladığı ÷ atanan`ı, sonra bunların ortalaması | Sayılmaz |
| **kurum_raporu.py** | Önce her öğretmenin kendi ilerleme ortalaması, sonra bunların ortalaması | **Sayılır** |

Yani CRM'in bugünkü `avgCompletion`'ı Excel'in **Genel Ortalama**'sı değil, **Tamamlanma Oranı**'na yakın bir şey. Ve `kurum_raporu.py` ile de aynı değil: biri satır düzeyinde, diğeri öğretmen düzeyinde ortalıyor — öğretmenlere farklı sayıda eğitim atanmışsa sonuçlar ayrışır.

`ENTEGRASYON.md` bu riski zaten yazmış: *"CRM ekranı ile kuruma giden rapor farklı sayı gösterir ve hangisinin doğru olduğu belirsizleşir."*

**Öneri:** `kurum_raporu.py` tanımını tek hakikat kabul et (kuruma giden rapor o) ve **iki metriği birden** hesapla, ayrı isimlerle:

- `genelOrtalama` — öğretmen düzeyinde, kısmi ilerleme sayılır *(Excel: Genel Ortalama)*
- `tamamlanmaOrani` — tamamlanan ÷ atanan, kısmi sayılmaz *(Excel: Tamamlanma Oranı)*

Mevcut `avgCompletion` alanı `tamamlanmaOrani` olarak yeniden adlandırılır; eski kayıtlar okunurken geriye dönük eşlenir.

**Karar gerekli:** Bu öneri kabul mü, yoksa Excel'in satır-düzeyi tanımı mı esas alınsın? Sayılar kuruma gidiyor; sonradan değiştirmek güven kaybettirir.

---

## 3. Veri modeli

### 3.1 Mevcut (değişmiyor)

```
report_uploads      (id, uploaded_by, dosya_adi, satir_sayisi, format, uploaded_at)
report_kurum_stats  (id, upload_id, kurum, teacher_count, stats JSONB, created_at)
```

Bu yapı **kurumlar arası karşılaştırma ve aylık takip için zaten yeterli** — bir yükleme = bir kesit, kurum başına bir satır. Ek tablo gerekmiyor.

### 3.2 `stats` JSONB'ye eklenecekler (şema değişikliği YOK)

| Alan | Neden |
|---|---|
| `genelOrtalama` | §2 |
| `certTeacherCount` | Excel: Sertifika Alan Öğretmen |
| `subeler[].hicBaslamayan`, `.devamEden`, `.certCount` | Şube Analizi sütunları |
| `kurslar[].hicBaslamayan`, `.certCount` | Eğitim Analizi sütunları |
| `sertifikaAylik: [{ay: "2026-08", adet: n}]` | Kümülatif sertifika eğrisi — `Sertifika Tarihi`'nden aylık histogram. **Kişisel veri içermez**, ham satır saklamadan geçmişi verir |

Hepsi additive; eski kayıtlar okunurken `?? varsayılan` ile ele alınır.

### 3.3 Yeni tablo — kurum ↔ okul eşleştirme

Rapordaki `Kurum` serbest metin (platform çıktısı); CRM'de `schools` tablosu var. Bugün eşleştirme küçük harfe indirgenmiş ad karşılaştırmasıyla yapılıyor — kırılgan. `BACKEND_TALEPLERI.md` de kalıcı `kurum_id` istiyor ama gelene kadar CRM kendi köprüsünü kurmalı.

```sql
CREATE TABLE report_kurum_eslestirme (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rapor_kurum text NOT NULL UNIQUE,   -- dökümdeki ad, normalize edilmiş
  school_id   uuid REFERENCES schools(id) ON DELETE SET NULL,
  onaylayan   uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Yüklemede eşleşmeyen kurumlar bir "eşleştirme bekliyor" listesine düşer; kullanıcı dropdown'dan okul seçer. Eşleştirme bir kez yapılır, sonraki yüklemelerde otomatik uygulanır.

**Bu, kullanıcının istediği "diğer kurumlarla ilişkili veriler"in omurgası:** eşleştirme kurulunca rapor verisi sözleşme (`expected_teacher_count`), atama, lead ve toplantı verisiyle aynı okul üzerinden birleşir.

---

## 4. Ekranlar

Raporlar sayfasına yeni sekmeler:

1. **Kurum Karşılaştırma** — tüm kurumlar tek tabloda, sıralanabilir, performansa göre renk skalası. Sözleşmedeki hedef öğretmen sayısıyla kapsama sütunu. TeacherX kimliğinde, PDF'e basılabilir.
2. **Şube Analizi** — tüm kurumların şubeleri; kurum filtresi. "Hiç Başlamayan %" ters renk skalası (yüksek = kırmızı).
3. **Eğitim Analizi** — eğitim bazında tamamlanma; hangi eğitim nerede tıkanıyor.
4. **Aylık Takip** — §5.
5. Mevcut **Kurum Raporu** sekmesi (tek kurum, kuruma gönderilen) korunur.

"TÜMÜ" seçeneği: kurum seçicisine eklenir, tüm kurumların toplamını gösterir. Toplama kuralı §2'deki tanıma uymalı — kurum ortalamalarının ortalaması **değil**, öğretmen düzeyinden yeniden hesap. Bunun için `stats` içinde ağırlık bilgisi (öğretmen sayısı, toplam ilerleme toplamı) tutulmalı.

---

## 5. Aylık Takip — CRM'de bedava

Excel'in en zahmetli özelliği bu: ham veride tarih olmadığı için her ay elle "kopyala → değer olarak yapıştır" ritüeli gerekiyor, unutulursa geçmiş kayboluyor.

**CRM'de bu iş zaten yapılmış durumda:** her `report_uploads` kaydının `uploaded_at`'i var ve o kesitin kurum özetleri `report_kurum_stats`'te duruyor. Yani **geçmiş otomatik birikiyor**, hiçbir ritüel gerekmiyor.

Yapılacak tek şey: son yükleme yerine **tüm yüklemeleri** çekip kurum bazında zaman serisi çizmek.

```sql
-- kurum başına aylık seri
select u.uploaded_at, s.kurum, s.teacher_count, s.stats
from report_kurum_stats s
join report_uploads u on u.id = s.upload_id
where u.format = 'kurs'
order by u.uploaded_at;
```

Ek olarak: aynı ay içinde birden fazla yükleme varsa **ayın son yüklemesi** o ayı temsil eder (kural netleştirilmeli).

Kümülatif sertifika eğrisi `stats.sertifikaAylik`'ten gelir ve kayıt tutmaya başlamadan önceki geçmişi de gösterir — Excel'deki davranışın aynısı.

---

## 6. 🔴 KARAR 2 — Öğretmen Listesi ve Detayı: ham satır gerekir

Excel'in iki sayfası (**Öğretmen Listesi**, **Öğretmen Detayı**) kişi bazlı. Bunlar için ham satırların saklanması gerekir:

```
ad, soyad, e-posta, kurum, şube, eğitim, ilerleme, sertifika tarihi
```

Bugün CRM bunları **bilerek saklamıyor** — yükleme tarayıcıda işleniyor, sunucuya yalnızca kurum bazlı sayısal özet gidiyor. Mevcut "Öğretmen Listesi" PDF'i yalnızca yükleme oturumunda üretilebiliyor, sayfa yenilenince kayboluyor.

Üç seçenek:

**A — Mevcut davranış korunur (en güvenli).** Öğretmen bazlı ekranlar CRM'e girmez; isimli liste yükleme anında PDF olarak alınır. Excel'in bu iki sayfası CRM'e taşınmaz.

**B — Ham satırlar saklanır (tam işlevsellik).** `report_rows` tablosu geri gelir (v1'de vardı, v2'de kaldırıldı). Öğretmen Listesi ve Detayı CRM'de yaşar, geçmişe dönük kişi bazlı takip mümkün olur. Gerektirir:
- RLS: yalnız admin + operasyon
- Saklama süresi politikası (örn. son 3 kesit, gerisi silinir)
- `KULLANIM.md`'deki taahhüdün gözden geçirilmesi — kurum raporu isimsiz kalmaya devam eder ama isimler artık DB'de durur
- KVKK: aydınlatma metni ve saklama gerekçesi

**C — Takma kimlikle saklanır (orta yol).** Ham satırlar e-postanın hash'iyle saklanır; isim ve e-posta DB'ye girmez. Kişi bazlı **eğilim** takibi mümkün olur ("bu kişi üç aydır ilerlemiyor"), ama kim olduğu CRM'den görülemez — isme ihtiyaç olduğunda o ayki Excel'den bakılır.

**Karar gerekli.** Bu, planın en büyük çatalı: A seçilirse iş yükü belirgin şekilde azalır, B seçilirse Excel'in tamamı karşılanır.

---

## 7. İş kırılımı

Her iş ayrı branch + PR. Sıra bağımlılığa göre.

| # | İş | Bağımlılık | Not |
|---|---|---|---|
| **1** | §2 metrik tanımlarının netleştirilmesi + `computeStatsByKurum` genişletilmesi (`genelOrtalama`, şube/eğitim ek sütunları, `sertifikaAylik`) | KARAR 1 | Şema değişikliği yok, sadece JSONB içeriği |
| **2** | `report_kurum_eslestirme` tablosu + eşleştirme ekranı | — | SQL bloğu kullanıcıya verilir |
| **3** | Kurum Karşılaştırma sekmesi | 1, 2 | En yüksek değer/en düşük risk — buradan başlanabilir |
| **4** | Şube Analizi + Eğitim Analizi sekmeleri | 1 | Aynı bileşen ailesi |
| **5** | Aylık Takip sekmesi | 1 | Şema değişikliği yok |
| **6** | "TÜMÜ" toplaması | 1 | Ağırlıklı toplama kuralı |
| **7** | Öğretmen Listesi / Detayı | KARAR 2 = B veya C | A seçilirse bu iş düşer |

**Önerilen başlangıç:** İş 1 → İş 3. Kurum Karşılaştırma tek başına Excel'in en çok kullanılan sayfası ve mevcut veriyle üretilebiliyor.

---

## 8. Kapsam dışı

- Excel'in renk skalaları birebir taklit edilmeyecek; TeacherX kimliğindeki (kırmızı vurgu) eşdeğerleri kullanılacak.
- `Listeler` ve `Kılavuz` sayfalarının CRM karşılığı yok (açılır listeler veriden türüyor, tanımlar arayüzde ipucu olarak verilecek).
- Excel'e geri yazma / Excel çıktısı üretme bu planda yok — çıktı formatı PDF.
- `--onceki` / `--arsiv` karşılaştırmaları (`kurum_raporu.py`) ayrı iş; Aylık Takip bunun yerini kısmen tutar.
