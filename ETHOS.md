# TeacherX CRM — Builder Ethos

These are the principles that shape how we think, recommend, and build this CRM.
Adapted from [gstack Builder Ethos](https://github.com/garrytan/gstack) by Garry Tan.

---

## The Golden Age

A small team with AI can now build what used to take an entire engineering department.
The engineering barrier is gone. What remains is taste, judgment, and the willingness
to do the complete thing.

TeacherX is building its own CRM — not buying an off-the-shelf tool, not patching
spreadsheets. That ambition is realistic today precisely because of this compression:

| Task type                   | Before AI  | AI-assisted | Fark      |
|-----------------------------|-----------|-------------|-----------|
| Boilerplate / scaffolding   | 2 gün     | 15 dk       | ~100x     |
| Test yazımı                 | 1 gün     | 15 dk       | ~50x      |
| Feature implementasyonu     | 1 hafta   | 30 dk       | ~30x      |
| Bug fix + regresyon testi   | 4 saat    | 15 dk       | ~20x      |
| Mimari / tasarım            | 2 gün     | 4 saat      | ~5x       |
| Araştırma / keşif           | 1 gün     | 3 saat      | ~3x       |

Bu tablo, hangi özelliklerin yapılıp yapılmayacağına dair her kararı değiştirir.
Eskiden atlanan "son %10"? Artık saniyeler içinde halledilebilir.

---

## 1. Boil the Ocean

"Okyanusun suyunu kaynatma" doğru bir tavsiyeydi — mühendislik zamanı darboğaz
olduğunda. O dönem bitti. AI destekli kodlama, eksiksizliğin marjinal maliyetini
neredeyse sıfıra düşürdü. Yarım yol hiçbir zaman yeterli değildir; tam yol artık
bedavaya yakın.

**Göl göl ilerle:** Okyanus hedeftir — bir modülün tamamı, tüm edge case'ler,
eksiksiz hata yolları. Oraya bir seferde değil, göl göl ulaşırsın; her göl
boşaltılabilir bir birimdir, tavan değil. "Bu okyanusu kaynatmak" artık bir
özelliği ertolemenin gerekçesi değil — bu zaten hedef.

**Eksiksizlik ucuz.** "Yaklaşım A (tam, ~150 satır) vs B (%90, ~80 satır)"
karşılaştırmasında her zaman A'yı seç. 70 satırlık fark, AI ile saniyeler
içinde telafi edilir. "Kısa yolu seç" düşüncesi, insan mühendislik zamanının
darboğaz olduğu dönemin kalıntısıdır.

**Anti-pattern'lar:**
- "B'yi seç — daha az kodla %90'ını karşılar." (A 70 satır daha fazlaysa, A'yı seç.)
- "Testleri sonraki PR'a bırakalım." (Test, kaynatılacak en ucuz göldür.)
- "Bu 2 haftayı alır." (De ki: "İnsan olarak 2 hafta / AI destekli ~1 saat.")

---

## 2. Search Before Building

İlk içgüdü "bunu zaten biri çözdü mü?" olmalı, "sıfırdan tasarlayayım" değil.
Alışılmadık bir pattern, altyapı sorunu veya runtime özelliğiyle ilgili bir şey
inşa etmeden önce — dur ve önce ara. Kontrol etmenin maliyeti neredeyse sıfır.
Kontrol etmemenin maliyeti, zaten varolan bir şeyin daha kötü versiyonunu yeniden
icat etmektir.

### Üç Bilgi Katmanı

**Katman 1: Denenmiş ve kanıtlanmış.** Standart pattern'lar, savaş testi görmüş
yaklaşımlar. Next.js App Router ile server component, Supabase ile RLS, shadcn/ui
ile form yönetimi — bunları yeniden icat etme.

**Katman 2: Yeni ve popüler.** Güncel best practice'ler, blog yazıları, ekosistem
trendleri. Bunları ara ama eleştirel oku — insan kolayca manyaya kapılır.
Arama sonuçları düşüncenin girdisi, cevabı değil.

**Katman 3: Birinci prensipler.** Eldeki problemi akıl yürüterek türetilen özgün
gözlemler. En değerli olanlar bunlardır. TeacherX'in spesifik iş süreçleri bazen
genel çözümlerin varsayımlarını çürütür — bu anları bul, adlandır, inşa et.

### txCRM bağlamında arama rehberi

Bir şey inşa etmeden önce şu sırayla kontrol et:

1. **`teacherx_crm_prd.md`'de var mı?** PRD, şemanın ve iş kurallarının tek kaynağıdır.
2. **shadcn/ui bileşeni var mı?** Tablo, form, diyalog, komut paleti — önce kontrol et.
3. **Supabase'in built-in özelliği var mı?** RLS, realtime, FTS, storage.
4. **Next.js'in çözdüğü bir şey mi?** Caching, server actions, middleware.

---

## 3. User Sovereignty

AI modeller öneri sunar. Kullanıcılar karar verir. Bu, diğer tüm kuralları geçersiz
kılan tek kuraldır.

PRD'den sapmak gerektiğinde Claude ikna edici argümanlar üretebilir. Bu bir yetki
değil, bir girdüdür. TeacherX ekibi, modellerin sahip olmadığı bağlama sahiptir:
iş ilişkileri, stratejik zamanlama, henüz paylaşılmamış planlar. İki model aynı
fikirde olduğunda bu güçlü bir sinyaldir. Emir değil.

**Doğru desen:** AI öneri üretir → kullanıcı doğrular ve karar verir → AI
doğrulama adımını asla atlamaz çünkü kendinden emindir.

**Anti-pattern'lar:**
- "Her iki model de aynı fikirde, dolayısıyla doğrudur." (Mutabakat sinyal, kanıt değil.)
- "Değişikliği yapıp sonra söylerim." (Önce sor. Her zaman.)
- PRD'ye aykırı bir kararı onaysız uygulamak.

---

## Beraber Nasıl Çalışırlar

Boil the Ocean der: **tam şeyi yap.**
Search Before Building der: **ne inşa edeceğine karar vermeden önce ne olduğunu bil.**

Birlikte: önce ara, sonra doğru şeyin tam versiyonunu inşa et.
En kötü sonuç, zaten tek satırlık bir çözümü olan bir şeyin eksiksiz versiyonunu
inşa etmektir. En iyi sonuç, herkesin yaptığını araştırıp gördükten sonra farklı
bir şey inşa etmektir — çünkü araştırdın, anladın ve başkalarının gözden
kaçırdığını gördün.

---

## Build for Yourself

TeacherX kendi problemini çözüyor. Bu CRM, TeacherX'in gerçek iş süreçlerini
yönetmek için inşa edildi — hayali bir müşteri için değil. Spesifik bir gerçek
problemin gücü, varsayımsal bir genellemenin gücünü her zaman geçer.

Bir feature'ın "genel CRM" standartlarına uymadığı ama TeacherX operasyonuna
mükemmel uyduğu durumlarda — TeacherX operasyonunu tercih et.
