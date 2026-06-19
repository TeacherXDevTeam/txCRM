# TeacherX CRM — Platform Foundation (Teknik Özet / Tartışma Notu)

> Amaç: Senior developer ile tartışmak üzere hazırlanmış mimari taslak. Henüz karar verilmedi; geri bildirim bekliyoruz.

## Stack (bağlam)
- Next.js 14 (App Router, TS strict), Server Components default
- Supabase (PostgreSQL + Auth + RLS + Realtime), `@supabase/ssr`
- Mutasyonlar server tarafında (server actions / route handlers) hedefleniyor

---

## 1. Problem / Hedef

Bugün CRM "sayfa-bazlı": her modül (lead, okul, eğitim, toplantı, atama, sözleşme…) kendi sayfasında statik form doldurma mantığıyla çalışıyor ve birbirinden büyük ölçüde izole.

İstediğimiz dönüşüm:
1. **İş akışı güdümlü çalışma** — örn. satışçı lead → toplantı → "finanstan teklif bekleniyor" durumuna geçirir, finans rolüne **bildirim** düşer; finans teklifi hazırlayıp lead üzerinden geri paylaşır.
2. **Progresif veri girişi** — az bilgiyle kayıt oluştur (draft), gerisini sonra doldur.
3. **Wizard'lar** — dashboard'dan "Lead Oluştur", "Teklif Ekle", "Toplantı Notu" gibi tetikleyicilerle çok adımlı sihirbazlar; statik form yerine.
4. **En önemlisi — genel zemin:** Bu yetenekler tek bir modüle özel olmamalı. Sistemdeki **herhangi iki varlık günün birinde ilişkilendirilebilir olmalı** ve iş akışları sonradan, şema değiştirmeden şekillenebilmeli.

**Kritik kısıt:** İlk fazda her modüle wizard yazmak zorunda değiliz. Amaç, *mümkün kılan* altyapıyı kurmak; özellikler kademeli eklenecek. Erken/aşırı mühendislikten (örn. baştan tam config-güdümlü kural motoru) kaçınmak istiyoruz.

---

## 2. Mevcut şemada zaten olanlar (sıfırdan başlamıyoruz)

- `leads.stage` (enum) → fiilen bir durum makinesi: `yeni_baglanti → teklif_iletildi → gorusme_yapildi → teklif_verildi → kapandi_kazanildi/kaybedildi`.
- `leads` progresif girişe uygun: yalnızca `contact_id` NOT NULL; gerisi nullable.
- `activities` (`school_id`/`lead_id`/`contact_id` + CHECK) → tipli FK'lerle olay/timeline kaydı.
- `meetings.related_entity_type` + `related_entity_id` → **zaten polymorphic** bir bağlama deseni var (`'school' | 'lead' | 'working_group' | 'trainer'`). Genel yapının çekirdeği bunu tüm sisteme yaymak.
- `assignments.status`, `contracts`, `orders` mevcut.

---

## 3. Hedef Mimari — İki Katman

### Katman A — Evrensel zemin (bir kez yazılır, tüm modüller bedavaya kullanır)
### Katman B — İş akışları & wizard'lar (sonra, ihtiyaç doğdukça, config ile eklenir)

Felsefe: A'yı sağlam kur → B'yi **şema değiştirmeden** ekleyebil.

---

## 4. Katman A — Foundation primitifleri

**(1) `entity_links` — evrensel ilişki tablosu** ⭐
```
from_type TEXT, from_id UUID, relation TEXT, to_type TEXT, to_id UUID, created_at
```
- Tek tablo, "any ↔ any" ilişki. Yeni ilişki türü = yeni satır, şema değişikliği yok.
- "Sistemdeki her şey günün birinde birbiriyle ilişkilendirilebilsin" şartının teknik karşılığı.

**(2) Entity registry** — sistemdeki bağlanabilir varlıkların tek kanonik listesi
(`school, lead, training, assignment, offer, contract, meeting, working_group, trainer, contact, team_member`) ve her biri için label/url resolver. `meetings.related_entity_*`, `notifications`, `entity_links` hepsi buradan beslenir → polymorphic referanslar tek yerden doğrulanır/render edilir.

**(3) Evrensel olay günlüğü** — `activities`'i `(entity_type, entity_id)` ile polymorphic hale genelleştir. Her varlık "geçmişim" özelliğini bedavaya kazanır.

**(4) `notifications` — polymorphic bildirim**
```
id, recipient_id (team_members), type, title, body,
entity_type, entity_id, is_read, created_at
```
- Devir-teslim sinyali. Supabase **Realtime** ile anlık zil bildirimi.
- Tercihen DB **trigger** ile üretilir (hangi client mutasyonu yaparsa yapsın bildirim garanti).

**(5) Generic `<Wizard>` + config registry** — tek çok-adımlı modal bileşeni; her wizard "hangi entity'yi oluşturur/ilerletir, adımları, hangi durum geçişini tetikler" diye beyan eder. Dashboard hızlı-işlem çubuğu bu defteri okur. Draft (kaydet & sonra devam et) desteği → progresif giriş.

---

## 5. Durum makinesi (workflow) yaklaşımı

- Her "süreç" varlığı bir `status` + tanımlı geçişler (lead.stage, training çekim hattı, assignment.status, offer.status).
- Geçişte side-effect: bildirim at + olay günlüğüne yaz + ilgili durumu değiştir.
- **Şimdilik hafif:** status kolonları + ince bir "transition" yardımcı fonksiyonu/trigger. **Sonra gerekirse** config-güdümlü motora terfi (workflows/states/transitions tabloları). Bilinçli olarak baştan kurmuyoruz.

---

## 6. Tasarım ilkesi: "Erişilebilirlik bir kopya değil, bir sorgudur"

Örn. çekimi biten eğitim "atanabilir" olduğunda elle bir listeye eklenmez; `status='yayinda'` olur ve her yer (atama wizard'ı, kurum eğitim listesi) onu **otomatik filtreler**: `trainings WHERE status='yayinda'`. Tek doğru kaynak korunur, senkron derdi olmaz.

---

## 7. Polymorphic vs Tipli FK — önerilen hibrit karar

| | Polymorphic (`entity_type+id`) | Tipli FK |
|---|---|---|
| Yeni entity eklemek | Şema değişmez | Kolon ekle gerekir |
| Veri bütünlüğü (FK/cascade) | Yok | Garanti |

**Öneri:** 
- **Çekirdek, zorunlu domain ilişkileri** → tipli FK (assignment→training, offer→lead).
- **"Bir gün lazım olabilir" tüm ilişkiler** → `entity_links` (polymorphic).
- Ayraç sorusu: *"Bu ilişki uygulamanın çalışması için zorunlu mu?"* Evet → FK, Hayır → `entity_links`.
- Polymorphic alanların geçerli tabloya işaret ettiğini doğrulayan hafif trigger + registry.

---

## 8. Önerilen ilk teslim — "Foundation Faz-1" (wizard'sız bile değerli)

1. `entity_links` + entity registry
2. `notifications` + zil UI + Realtime (tercihen trigger-üretimli)
3. `activities` → polymorphic evrensel olay günlüğü
4. Generic `<Wizard>` iskeleti (config defteri başlangıçta boş/1 pilot)

Sonuç: hiç yeni modül wizard'ı yazmadan sistem "ilişkilenebilir + bildirimli + geçmişli" hale gelir. Lead/eğitim/toplantı wizard'ları üstüne kademeli eklenir.

---

## 9. Senior'a sormak istediklerimiz / açık kararlar

1. `entity_links` merkezli **hibrit** model + A/B katman ayrımı sağlam mı? Alternatif: her şey polymorphic (sadelik) vs. her şey tipli (bütünlük) — trade-off'lar kabul edilebilir mi?
2. `entity_links.relation`: **serbest metin** (max esneklik, tutarsızlık riski) vs **enum** (düzen, her yeni tür için migration)? Eğilim: serbest metin + registry'de önerilen değerler.
3. Bildirim üretimi: **DB trigger** mı, **server action içinde uygulama kodu** mu? (Garanti vs. test edilebilirlik/karmaşıklık.)
4. Workflow motoru: "hafif başla, sonra config-güdümlüye terfi" stratejisi makul mü, yoksa baştan minimal bir workflow tablo seti mi kurmalı?
5. RLS etkileşimi: polymorphic tablolarda (`entity_links`, `notifications`, olay günlüğü) satır-bazlı erişim politikaları nasıl kurulmalı? (entity_type'a göre değişen görünürlük — özellikle lead/sözleşme gizliliği.)
6. Performans/indeksleme: polymorphic `(entity_type, entity_id)` sorguları için indeks stratejisi ve olası N+1 riski.
7. `meetings` zaten polymorphic — `entity_links` ile birleştirilsin mi, yoksa ayrı mı kalsın?

---

## 10. Mevcut ilgili enum'lar (referans)
```
lead_stage_enum:        yeni_baglanti, teklif_iletildi, gorusme_yapildi,
                        teklif_verildi, kapandi_kazanildi, kapandi_kaybedildi
assignment_status_enum: planlanmis, devam_ediyor, tamamlandi, iptal
training_status_enum:   aktif, pasif, gelistirme   (çekim hattı için genişletilecek)
activity_type_enum:     telefon, eposta, toplanti, ziyaret, not
meeting_type_enum:      core_group, ekip, okul_ziyareti, wg_oturumu, diger
```
