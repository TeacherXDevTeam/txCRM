# TeacherX CRM — Mevcut Durum

> Her işlem sonunda güncellenir. Son güncelleme: 2026-09-09

### Son İşlem — Konum artık profil tamamlama şartı değil (2026-09-10)
Kullanıcının isteği: konum beklenmesin, beklenen öğretmen şart kalsın. Kural il VE ilçe istiyordu; rapordan gelen kurumların çoğunda ilçe anlamlı bir bilgi değil ve o rozet 101 okulda kalıcı olarak açık kalıyordu. Sürekli açık kalan bir uyarı bakılmayan bir uyarıdır ve asıl eksikleri de gizler. Konum bilgisi duruyor — listede ve okul detayında görünüyor — yalnızca "profil tamam mı" hesabına girmiyor. Süzgeç çipi de kalktı. Tarayıcıda kullanıcının gerçek sayılarıyla doğrulandı: çipler artık Koordinatör eksik (42) · Sözleşme eksik (17) · Beklenen öğretmen eksik (101). Toplam yine 101 görünüyor çünkü beklenen öğretmen HER okulda eksik ve kullanıcı o şartın kalmasını istedi; sayının düşmesi için o sütunun doldurulması gerekiyor.

### Son İşlem — Onboarding adımları veriden çıkarılıyor (2026-09-10)
Kullanıcı bir okulda 20 atama olmasına rağmen "Eğitim Paketi Belirlendi" adımının tiksiz durduğunu bildirdi. Sebep: onboarding adımları YALNIZCA `onboarding_milestones` tablosundan okunuyordu ve o tabloya uygulamanın hiçbir yerinden yazılmıyor — yani pano gerçek veriye hiç bakmıyordu. Üç adım artık kanıttan çıkarılıyor: sözleşme kaydı varsa "Sözleşme İmzalandı", koordinatör varsa "Koordinatör Girildi", atama (ya da paketli sözleşme) varsa "Eğitim Paketi Belirlendi". Türetilen tikin yanında "otomatik" etiketi çıkıyor ki tikin nereden geldiği belli olsun. Elle işaretlenmiş bir adım, kanıt olmasa da işaretli kalıyor — insanın verdiği bilgi türetmeden güçlüdür. "Açılış Toplantısı" ve "CertifiX Hesabı" bilerek türetilmiyor: bir toplantı kaydının açılış toplantısı olduğunu bilemeyiz, CertifiX'in DB'de karşılığı yok. Dört senaryo tarayıcıda doğrulandı; kullanıcının durumu %40'tan %60'a çıkıyor.

### Son İşlem — Okul tipi varsayılanı 'ozel' (2026-09-09)
Kullanıcı okullarının tamamının özel olduğunu söyledi. Şema varsayılanı 'devlet' olduğu için tipi belirtilmeden açılan her kayıt — özellikle rapor içe aktarmasıyla açılanlar — yanlış etiketleniyordu (listede Bilge Montessori, Bayetav, BİLNET "Devlet" görünüyordu). Üç yerde düzeltildi: `okulOlustur` artık açıkça 'ozel' yazıyor, okul formunun varsayılanı 'ozel' oldu, ve `20260909200000_okul_tipi_varsayilani.sql` şema varsayılanını değiştiriyor. Migration mevcut satırlara DOKUNMUYOR; geçmişi düzeltmek ayrı ve isteğe bağlı: `supabase/sorgular/okul_tipi_duzelt.sql` önce dağılımı gösteriyor, sonra 'devlet' görünenleri listeliyor (gerçek bir devlet okulu varsa ayrılabilsin), sonra çeviriyor. İkisi de yerel Postgres'te gerçek şemayla sınandı: tip belirtilmeden açılan kayıt 'ozel' doğdu, düzeltme sorgusu eski kaydı çevirdi.

### Son İşlem — Okul formu şehri uyduruyordu (2026-09-09)
Kullanıcı "elle düzelttiklerim DB'ye yazılmıyor mu?" diye sordu. Form incelendi: status DOĞRU yazılıyor, hata olsa ekranda görünürdü; ekran görüntüsünde de BİLNET "Pasif" duruyor. Yani elle düzeltmeler işliyor, CSV muhtemelen o düzeltmeden önce alınmış. Ama aynı formda gerçek bir kusur çıktı: `city: form.city.trim() || "İstanbul"`. Şehri boş bir okulu BAŞKA bir sebeple düzenleyip kaydetmek (ör. durumunu Pasif yapmak) şehri sessizce İstanbul yazıyordu. Kullanıcının ekran görüntüsündeki "BİLNET · İstanbul" büyük olasılıkla böyle oluştu. Fallback kaldırıldı; boş şehir boş kalıyor (schools.city NOT NULL ama boş string'e izin veriyor) ve "Profil Tamamlama"da eksik olarak görünüp düzeltiliyor. İlke: yanlış veri, eksik veriden kötüdür — eksik olan görünür, yanlış olan doğru sanılır.

### Son İşlem — İçe aktarmada okul durumu (2026-09-09)
Kullanıcı, kendi sisteminde pasif işaretlediği kurumların (ör. BİLNET) CSV'de aktif göründüğünü bildirdi. İki bulgu: hiçbir tamamlama raporunda durum/aktiflik sütunu YOK, yani CRM bunu rapordan öğrenemez; ve BİLNET 09.09 raporunda hiç geçmiyor, kayıt temmuz dosyasının eşleştirmesinden gelmiş olmalı. Kodda gerçek bir kusur bulundu: `okulOlustur` durumu `'aktif'` olarak SABİTLİYORDU. Geçmiş dönem raporundan açılan bir okul için bu yanlış — o kurumla artık çalışılmıyor olabilir. Durum artık çağırandan geliyor ve kaydedilen kesit güncel değilse `'potansiyel'` yazılıyor. Mevcut bir okul bulunduğunda durumuna hiç dokunulmuyor; elle yapılan işaretleme içe aktarmayla ezilmemeli. Ayrıca eşleştirme ekranındaki okul listesinde durum gösteriliyor ("BİLNET Okulları (pasif)") — pasif bir okul ayırt edilemediği için gözden kaçıp yeniden açılabiliyordu. Tarayıcıda doğrulandı: eşleştirici pasif okulu buluyor ve otomatik seçiyor, yani CRM'de kayıt varsa mükerrer açılmaz. Teşhisi kesinleştirmek için `supabase/sorgular/okul_durum_kontrol.sql` eklendi — durum dağılımı, mükerrer şüphesi, aranan kurum, ve yalnız geçmiş kesitte görünüp hâlâ 'aktif' duran okullar.
### Son İşlem — CSV Türkçe karakter bozulması (2026-09-09)
Kullanıcı şablondaki adların bozuk çıktığını bildirdi ("Okulları" → "OkullarÄ±", "İstanbul" → "Ä°stanbul"). Sebep: `xlsx`, ham buffer verilen bir CSV'yi UTF-8 saymıyor. Birebir üretildi ve düzeltildi — CSV artık `readFileSync(..., "utf8")` ile metin olarak okunup `type: "string"` veriliyor, baştaki BOM temizleniyor. Ayrıca bozuk kodlama sessizce geçmesin diye iki yönlü koruma kondu: `U+FFFD` (dosya UTF-8 değil, ör. ISO-8859-9) ve `Ä±`/`Ã¶` deseni (bir kez fazla çevrilmiş). İlk yazdığım koruma yalnız ikinci yöne bakıyordu ve ISO-8859-9 dosyayı sessizce geçiriyordu; test bunu yakaladı. Zincirin tamamı yerel Postgres'e kadar doğrulandı: "Naci Akdoğan Okulları · İstanbul · Şişli · Öğretmen başına — İstanbul şubesi · Şeyma Güngör / Müdür" hepsi bozulmadan yazıldı.

### Son İşlem — Okul profil verisi için toplu giriş akışı (2026-09-09)
101 okulda konum, sözleşme ve beklenen öğretmen eksikti; tek tek arayüzden girmek makul değildi. Üç parçalı akış: `supabase/sorgular/okul_eksikleri.sql` eksikleri CSV olarak döküyor, `scripts/okul-veri-sablonu.mjs` doldurulacak Excel'i üretiyor (yalnız eksiği olan okullar; okul id'leri taşınıyor ki ada göre eşleştirme riski olmasın), `scripts/okul-veri-sql.mjs` doldurulmuş dosyayı SQL'e çeviriyor. Üretilen SQL'in ilkeleri: id ile güncelleme, boş alan YAZILMAZ (mevcut değerin üstüne boş geçilmez), sözleşme yalnız iki tarih de doluysa açılır, tamamı tek transaction. Koordinatörler ayrı sayfada ve kişisel veri içerdiği için isteğe bağlı. YEREL POSTGRES'TE GERÇEK ŞEMAYLA SINANDI ve iki hata yakalandı: (1) `contact_type` için 'kurum_yetkilisi' yazılmıştı, öyle bir enum yok — doğrusu 'okul_koordinatoru'; SQL Editor'de patlardı. (2) Satır içi alt sorgu değişimi bir yerde tutmamıştı, `kayit_sahibi()` diye var olmayan bir fonksiyon çağrılıyordu. Ayrıca sözleşmesi olan okulda "beklenen öğretmen" sessizce yok sayılıyordu; artık mevcut sözleşmeyi güncelliyor. Geri alma da sınandı: kasten bozulmuş bir satırla çalıştırıldığında ROLLBACK oluyor ve hiçbir şey yazılmıyor.

### Son İşlem — Kesitler ekranı: listeleme ve silme (2026-09-09)
Kullanıcı aynı raporu farkı görmek için iki ayrı tarihe kaydetmişti ve fazlasını silmek istedi; silmenin tek yolu SQL Editor'e gitmekti. Raporlar'a "Kesitler" sekmesi eklendi: kayıtlı kesitler tarih, eğitim yılı, dosya adı, kurum/öğretmen/satır sayısıyla listeleniyor. Aynı dosyanın iki tarihe kaydedildiği böyle bakışta görülüyor (dosya adı aynı çıkıyor). Silme tek tıkla YAPILMIYOR: satır önce onay moduna geçiyor ("Geri alınamaz · Sil · Vazgeç") ve yalnız o satır vurgulanıyor. "Hepsini sil" gibi toplu bir işlem bilerek konmadı — bu oturumda bir kesit kazayla zaten kaybedilmişti. Silme cascade ile alt satırları da götürüyor ama `schools` etkilenmiyor. `TrendKesit` dosya adı, satır ve öğretmen sayısıyla genişletildi; sunucu sorgusuna iki alan eklendi (ek sorgu yok). Ekran yayına çıkana kadar kullanılabilecek `supabase/sorgular/kesit_sil.sql` da eklendi — önce listeleyen, sonra silen, sonra doğrulayan üç adımlı.

### Son İşlem — Üzerine yazma artık onay istiyor (2026-09-09)
Uyarı yetmedi: kullanıcı geçmiş dönem dosyasını tarihi değiştirmeden kaydetti ve güncel kesit silindi. Uyarı okunmadan geçilebilecek bir metindi; kaza olabilecek bir işlem bilinçli bir onay gerektirmeli. Artık seçilen tarihte kayıtlı kesit varsa hem Kaydet hem Eşleştirme düğmesi KAPALI; açılması için "… kesitinin silinmesini onaylıyorum" kutusu işaretlenmeli. Onay, tarih değişince ve yeni dosya seçilince sıfırlanıyor. Tarayıcıda gerçek dosya yüklenerek doğrulandı: çakışan tarihte iki düğme de kapalı, onaydan sonra ikisi de açık; tarih 13.07.2026 yapılınca uyarı ve kutu kayboluyor, düğmeler onaysız açık; çakışan tarihe geri dönülünce onay sıfırlanıp düğmeler tekrar kapanıyor. Kullanıcının kaybı kurtarılabilir: iki kaynak Excel de yerinde (20.655 ve 23.108 satır), doğru tarihlerle yeniden yüklenerek geri alınıyor.

### Son İşlem — Kesit tarihi tuzağı kapatıldı (2026-09-09)
Kullanıcı geçmiş dönem dosyasını nereye yükleyeceğini sordu; akışı anlatmadan önce kontrol edilince veri kaybettirecek bir tuzak bulundu. `kesitTarihi` state'i kayıtlı kesitin tarihiyle açılıyor ve yeni dosya seçilince SIFIRLANMIYORDU; `kesitKaydet` ise aynı tarihli kesiti önce siliyor. Yani geçmiş dönem dosyası yüklenip tarih değiştirilmeden kaydedilse, güncel kesit silinip yerine eski veri yazılacaktı — sessizce. İki düzeltme: (1) yeni dosya seçilince tarih bugüne çekiliyor; (2) seçilen tarihte kayıtlı kesit varsa üzerine yazılacağını söyleyen kırmızı uyarı çıkıyor, kurum sayısıyla birlikte. Tarayıcıda gerçek dosya yükleyerek uçtan uca doğrulandı: X → dosya seç → uyarı çıktı ("09.09.2026 tarihinde zaten kayıtlı bir kesit var (2 kurum)… Geçmiş dönem yüklüyorsanız kesit tarihini o dönemin tarihine çevirin"), tarih 2026-07-13 yapılınca uyarı kayboldu, geri alınınca tekrar çıktı.

### Son İşlem — Eski raporlara Kurum sütunu ekleme aracı (2026-09-09)
Kullanıcı eski raporda yalnız Şube sütunu olduğunu söyleyip "exceli sen düzenler misin" diye sordu. Dosyayı almak projenin ilk kuralına aykırı olurdu (KVKK: ham rapor buraya gönderilmez, tüm mimari bunun üzerine kurulu), o yüzden dosyayı bu makineden çıkarmayan bir araç yazıldı: `scripts/rapor-kurum-ekle.mjs`. İki adımlı — önce şubeleri listeleyip eşleştirme şablonu (JSON) üretiyor, sonra doldurulmuş şablonla Kurum sütunlu YENİ bir dosya yazıyor; özgün dosyaya dokunmuyor. Kurum sütunu Şube'nin soluna, bu yılki raporun sütun sırasına uyacak şekilde ekleniyor. Şubelerden biri bile boş bırakılırsa iş durduruluyor — boş geçilse o satırlar sessizce kurumsuz kalırdı. Sentetik 40 satırlık dosyayla uçtan uca doğrulandı: özgün dosyayı uygulamanın ayrıştırıcısı REDDEDİYOR, dönüştürülmüş dosyayı kabul edip "ozet" olarak okuyor ve 3 kurum üretiyor; üretilen kesit çıktısında e-posta ve ad geçmiyor.

### Son İşlem — Eğitim öğretim yılı grafiğe ve tabloya işlendi (2026-09-09)
Kullanıcı okul yılının takvim yılı olmadığını söyledi: Ağustos'ta başlıyor, Temmuz'da bitiyor; son rapor temmuz sonu alınıyor ve sözleşme dönemi de buna göre işliyor. `egitimYili` eklendi (sınır tek bir sabitte: `EGITIM_YILI_BASLANGIC_AYI = 8`), "2025-26" biçiminde etiket üretiyor. Aylık Takip'te: grafiğe her 1 Ağustos'a kesikli dikey ayraç ve yıl etiketi, tablo başlıklarına tarihin altına eğitim yılı, üst satıra "2024-25 → 2026-27 eğitim yılları" (tek yıl içindeyse tekil), ipuçlarına da eğitim yılı. Böylece temmuz kapanışının eylül kesitinden FARKLI bir eğitim yılında olduğu grafikten okunuyor — takvim yılına bakan biri bunu kaçırırdı. 19 birim kontrolü; ikisi düştü ve yine KOD haklı çıktı (2025-06-30 → 2026-10-09 aralığında bir değil İKİ yıl sınırı var), beklentiler düzeltildi. Üç senaryo tarayıcıda: temmuz kapanışı + üç aylık kesit, üç yıllık kapanış serisi, tek yıl içinde (ayraç yok, başlık tekil).

### Son İşlem — Aylık Takip grafiği zaman eksenine geçti (2026-09-09)
Kullanıcı geçen yılın kapanış raporunu tek seferlik yükleyip yıllık karşılaştırma almak istedi. Bunun için yeni özellik gerekmiyor — kesit tarihi geçmişe verilir, "Değişim" sütunu doğrudan yıllık farkı gösterir. Ama bu kullanım grafikte gerçek bir kusuru tetikliyordu: noktalar tarihe göre değil SIRAYA göre eşit aralıklı çiziliyordu, yani 15 aylık boşluk ile 1 aylık boşluk aynı genişlikte görünüyor ve eğim yanıltıcı oluyordu. `zamanKonumlari` eklendi: konumlar gün farkına göre 0..1 aralığına yerleşiyor. Gün hesabı `Date.UTC` ile yapılıyor, `new Date(str)` ile değil — yerel saat dilimi işin içine girmesin (aynı tuzak daha önce canlıyı çökertmişti). Noktalar kümelenince etiketler üst üste binmesin diye ilk ve son daima yazılıyor, aradakiler yalnız 46px boşluk varsa; yazılmayanların yeri küçük çentikle gösteriliyor. 12 birim kontrolü + üç senaryo tarayıcıda (yıl atlamalı 4 kesit, düzenli aylık, 13 kesitlik yoğun: 7 etiket + 6 çentik, en dar aralık 68px). Sabit sepet bu kullanımda doğru davranıyor: geçen yıl olmayan kurumlar toplamdan düşüyor, yani karşılaştırma iki yılda da ölçülen kurumlar üzerinden gidiyor.
### Son İşlem — Kurum Takip Panosu kapandı (2026-09-09)
PR #24 ve #25 merge edildi, Production `8246a9a`'ya çıktı, DROP migration'ı canlıda çalıştırıldı — `report_uploads` ve `report_kurum_stats` artık 404, kesit tabloları ayakta. Kullanıcı düzeltme turunu tamamladı. `PLAN_KURUM_TAKIP_PANOSU.md`'nin 9 adımı bitti; PROGRESS.md buna göre güncellendi ve İş 5'in kesit tablolarına göre yeniden yazılması gerektiği not olarak eklendi (plan silinen tablolara dayanıyordu). Sıradaki: Faz 2 İş 2 — kazanılan lead → sözleşme köprüsü.

### Son İşlem — Adım 8 (TÜMÜ) + Adım 9 (temizlik) — Kurum Takip kapandı (2026-09-09)
Kurum seçicisine "TÜMÜ — bütün kurumlar" eklendi; seçilince aynı markalı kurum raporu bütün kurumların toplamı için üretiliyor ve PDF'e basılabiliyor. Üç kural: ortalamalar öğretmen sayısıyla **ağırlıklı** (düz ortalama 92 kurumu eşit sayardı), **eğitim sayısı toplanmaz** — aynı eğitim birçok kuruma atandığı için adların BİRLEŞİMİ alınır (sentetik veride 92×5=460 değil 7 çıkıyor), ve eğitim oranları ham sayıdan yeniden hesaplanır, oranların ortalaması alınmaz. Bilinmeyen tek bir değer varsa toplam da bilinmiyor kalıyor. Şube kırılımı yerine KURUM kırılımı konuyor — 92 kurumun 273 şubesini tek listede göstermek okunmazdı; başlıklar, KPI etiketi ve alt başlık toplam modunda buna göre değişiyor. 23 birim kontrolü + 92 kurumluk sentetik veriyle tarayıcı doğrulaması. Adım 9: `report_uploads` ve `report_kurum_stats` için DROP migration'ı yazıldı (kodda referansı kalmamıştı) ve `types/database.ts`'ten çıkarıldı; migration silmeden önce satır sayısını gösteren doğrulama sorgusunu içeriyor. Böylece PLAN_KURUM_TAKIP_PANOSU.md'nin 9 adımı tamamlandı.

### Son İşlem — "Eşleştirmeyi düzelt" kayıtlı kesitte tıklanamıyordu (2026-09-09)
Kullanıcıya "Raporlar → Eşleştirme" yolunu tarif ederken kontrol edince düğmenin `kayitliMi` ile devre dışı bırakıldığı görüldü: kayıtlı bir kesit varken — yani sayfa her açıldığında — tıklanamıyordu. Yanlış bir eşleştirmeyi düzeltmenin tek yolu Excel'i yeniden yüklemek oluyordu, ki düzeltme turunun tamamı bunun üzerine kuruluydu. Düğme artık yalnız kaydetme sırasında kapanıyor ve kayıtlıyken "Eşleştirmeyi düzelt" yazıyor. Yeniden kaydetmek zararsız: aynı tarihli kesit silinip yazılıyor. Uçtan uca tarayıcıda doğrulandı: kayıtlı kesitle sayfa açıldı, düğme etkin, tıklayınca çakışma uyarısıyla ekran açıldı, süzgeç iki çakışan kurumu bıraktı, yanlış eşleşme düzeltilince uyarı kayboldu ve "dikkat isteyenler" sayacı 0'a düştü.

### Son İşlem — Eşleştirmede arama + "yalnız dikkat isteyenler" süzgeci (2026-09-09)
Çakışmaları göstermek yetmiyordu; 92 satırlık tabloda o kurumları bulmak hâlâ zahmetliydi. Eklendi: kurum/okul adı araması ve tek tıkla süzgeç. "Dikkat isteyen" = çakışan (aynı okula 2 kurum) + şüpheli + ilk kez görülen. Şüpheli tanımı yeni bir saf fonksiyonla geliyor (`eslesmeSupheliMi`): rapordaki ad ile bağlandığı okulun adı arasında TEK ortak ayırt edici kelime yoksa işaretlenir — "Amerikan Kültür Kolejleri Genel Merkezi" ↔ "ALKEV" tam böyle yakalanıyor, {amerikan,kultur,genel,merkezi} ∩ {alkev} = ∅. Karar değil işaret; "AÇI Okulları Tuzla" ↔ "AÇI Okulları" gibi meşru farklar işaretlenmiyor. 10 birim kontrolü; biri düştü ve KOD haklı çıktı (adı yalnız jenerik kelimelerden oluşan eşleşme gerçekten insana bakılmalı), beklenti düzeltildi. Tarayıcıda 63 satırlık senaryo 3 satıra indi, arama "amerikan" ile tek satır bıraktı. Böylece düzeltme turu için SQL çalıştırmaya gerek kalmıyor.

### Son İşlem — Çakışan eşleştirme görünür oldu + iki hata (2026-09-09)
Kullanıcı ALKEV okul sayfasında "raporda Amerikan Kültür Kolejleri Genel Merkezi" gördü. Eşleştirici sınandı, masum çıktı: o adı ALKEV'e bağlamıyor (benzerlik 0.00, "eşleşme yok") — bağlantı elle ya da uzun listede yanlış seçimle oluşmuş. Ama ekran görüntüsü BENİM iki hatamı ortaya çıkardı. (1) Okul detay paneli aynı kesitteki iki kurumu zaman serisi sanıyordu: "2 kesit" diyordu ama ikisi de 09.09.2026'ydı ve iki ayrı kurumun farkını "değişim" diye basıyordu (+1.328 öğretmen, −23,6 puan). Artık kesit tarihine göre gruplanıyor; aynı tarihte birden çok kurum varsa sayı üretilmiyor, çakışma kurumlarıyla birlikte gösteriliyor ve nasıl düzeltileceği yazıyor. (2) Aylık Takip'te kurum adı "en son kesitten" alınıyor sanılıyordu ama kod son SATIRI alıyordu; sorgu kesit_id'ye (UUID) göre sıraladığı için ad rastgele bir kesitten gelebiliyordu — kesit sırasına bağlandı, 3 kontrol eklendi. Ayrıca eşleştirme ekranına çakışma uyarısı kondu: aynı okula iki kurum bağlanıyorsa hangi kurumlar olduğu listeleniyor (hatırlanan kararlar bulanık eşleştiricinin çakışma kontrolünü atlıyordu). Teşhis SQL'ine çakışanları ve adı hiç benzemeyen eşleşmeleri listeleyen iki sorgu eklendi.

### Son İşlem — Rapordaki kurumlar okul olarak açılamıyordu (2026-09-09)
Kullanıcı bildirdi: eşleştirme artık hatırlanıyor ama rapordaki 92 kurumun hiçbiri Okullar listesine eklenmemiş — okul sayısı 61'de duruyor (seed'den gelen sayı). Teşhis koddan çıkarıldı: `okulOlustur` her okulu tek tek ve `kesitKaydet`'ten ÖNCE yaratıyor, transaction yok; bir tanesi bile çalışsaydı sayı 61'i geçerdi. Yani hiçbir "yeni okul" kararı kaydedilmemiş, 92 kurum ya mevcut okula bağlanmış ya "Bağlama" olarak yazılmış. Sebep büyük olasılıkla şehir zorunluluğu: eşleştirme ekranı şehri boş olan tek bir yeni okul varken Kaydet'i kilitliyordu, oysa `schools.city` NOT NULL olsa da boş string'e izin veriyor ve sistemdeki 61 okulun şehri zaten dolu değil ("Belirtilmedi"). 30+ kuruma elle şehir yazmak yerine hepsini "Bağlama" seçmek tek çıkış yoluydu. Üç düzeltme: (1) şehir isteğe bağlı, tahmin yine ön dolu; (2) "Bağlanmayacak N kurumu hepsini yeni okul olarak ekle" toplu düğmesi — 92 satırda 31 satırı elle çevirmek pratik değil; (3) ekran atlandığında mesaj artık kaç kurumun bağlı, kaçının bağlı OLMADIĞINI söylüyor — eskisi "92 kurumun tamamı hatırlandı" deyip 31 bağsız kurumu gizliyordu. Ayrıca `okulOlustur` idempotent yapıldı: aynı adda okul varsa yenisini açmıyor, çünkü 31 sıralı insert'in ortasında hata olursa kullanıcı tekrar denediğinde ilk açılanlar mükerrer olurdu. Gerçekçi senaryoyla (61 okul / 92 kurum / 31 bağsız) tarayıcıda doğrulandı: toplu düğme 61-0-31'i 61-31-0 yapıyor, toplam 92 kalıyor, boş şehirle Kaydet açık ve kayıt yüküne 31 "yeni" giriyor. Teşhisi kesinleştirmek için `supabase/sorgular/kesit_eslestirme_durumu.sql` eklendi.

### Son İşlem — Eşleştirme kararları artık hatırlanıyor (2026-09-09)
Kullanıcı bildirdi: aynı raporu her yüklediğinde eşleştirme ekranı baştan çıkıyordu. Ekran birebir "Eşleştirme kaydedilir; sonraki kesitlerde tekrar sorulmaz" yazıyordu ama kod bu sözü tutmuyordu — kararlar `report_kurum.school_id`'de duruyor, yeni yüklemede hiç okunmuyor, her şey sıfırdan bulanık eşleştirmeyle türetiliyordu. İki somut zarar: (1) elle verilen karar (adı hiç benzemeyen bir okula bağlama) her seferinde kayboluyordu; (2) "Bağlama" kararı hiç saklanmadığı için o kurum tekrar "yeni okul olarak ekle" diye öneriliyordu — tıklandığında MÜKERRER okul açardı. Düzeltme: `oncekiKararlariCikar` en son kesitteki kararı çıkarıyor (satır var + school_id null = bilerek bağlanmadı; satır yok = hiç görülmedi), `kararlariHazirla` hatırlanan kararı bulanık eşleştirmenin üstüne koyuyor. Hatırlanan okul silinmişse karar düşüyor, kurum yeniden soruluyor. Sorulacak hiçbir şey yoksa Kaydet eşleştirme ekranını atlayıp doğrudan kaydediyor ve kaç kurumun hatırlandığını bildiriyor; ekrana "Eşleştirme" düğmesiyle elle girilebiliyor. Ekranda sorulması gerekenler üste sıralanıyor ve "hatırlandı (tarih)" rozeti çıkıyor. Özet kutuları da düzeltildi: eskiden hatırlanan kurumlar iki kez sayılıyordu (4+2+0+1+1=8 ama 5 kurum vardı), artık birbirini dışlayan üç kutu ve toplamı kurum sayısına eşit. 19 birim kontrolü + tarayıcı doğrulaması. Ek sorgu yok — kararlar Aylık Takip için zaten çekilen satırlardan çıkıyor.

### Son İşlem — Okul detay sayfasında Eğitim Tamamlama paneli + PROGRESS.md tazelendi (2026-09-09)
`/okullar/[id]`'ye kesit özeti paneli: son kesitin KPI'ları (öğretmen, ilerleme ort., tamamlanma, hiç başlamayan) bir önceki kesite göre farkıyla, ilerleme eğrisi ve şube kırılımı. Rapordaki kurum adı okul adından farklıysa yanında gösteriliyor — eşleştirmenin doğru olduğu tek bakışta görülüyor. Veri yoksa bölüm hiç çıkmıyor. Şubeler yalnızca en son kesitten alınıyor (eskisiyle karışırsa toplam şişerdi). Renkler bilerek nötr: bu sayfada kırmızı zaten "kötüleşme" demek (delta rozetleri), eğri ve barlar da kırmızı olsaydı tek ekranda iki anlam taşırdı. PostgREST gömülü sorgusu (`kesit:report_kesit(...)`) kasten yanlış ilişki adıyla kontrol edilerek doğrulandı — yanlışı 400 döndürüyor, benimki 200. Sentetik veriyle tarayıcıda: 5 kesit, tek kesit (delta/eğri yok), sertifikasız kesit ve veri yok halleri.

Ayrıca kapatılan PR #11'in geriye kalan tek parçası tamamlandı: kod tarafı #16'da yeniden yapılmıştı ama `PROGRESS.md` bir aydır güncellenmemişti — Kurum Takip işinin tamamı (Adım 1–7, kesit tabloları, PR #12/#16–#19) içinde yoktu, biten İş 1 hâlâ "sıradaki" görünüyordu. Dosya CLAUDE.md'ye göre her oturumda okunuyor, yani eskimiş hali her yeni oturumu yanlış yönlendirirdi. Blokerlar da gerçeğe çekildi (Vercel düzeldi, tip eksikliği kapandı, publishable anahtar ve CLI yetkisi duruyor) ve iki hydration/Server Component dersi "ÖNCE OKU" bölümüne eklendi.

### Son İşlem — Adım 7: Aylık Takip sekmesi (2026-09-09)
Kesitler arası zaman serisi: metrik seçici (ilerleme, tamamlanma, sertifika, hiç başlamayan, tümünü tamamlayan, öğretmen), çizgi grafik (siyah = toplam, kırmızı = seçilen kurum) ve kurum × kesit tablosu + değişim rozeti. Hesaplama `kesit-trend.ts`'te, saf modül — `kesit-map.ts` dersi gereği "use client" yok. İki tuzak açıkça ele alındı: (1) toplam, öğretmen sayısıyla **ağırlıklı** (düz ortalama olsaydı 12 öğretmenli kurum 940 öğretmenliyle aynı ağırlıkta olurdu); (2) **sabit sepet** varsayılan — sonradan eklenen bir kurum toplamı aşağı çektiği için değişken sepette iki kurum da ilerlerken toplam düşmüş görünüyor (sentetik veride %53,6 → %43,8 yerine %53,6 → %63,6). Eksik kesitler çizgide **kopuk** çiziliyor, sıfırla doldurulmuyor; sertifikayı bilmeyen tek kurum varsa toplam da "—". Kurum kimliği `school_id`, yoksa ad — kurum adı düzeltilse bile seri kopmuyor. 23 birim kontrolü ve sentetik veriyle tarayıcı doğrulaması yapıldı; tarih biçimi UTC/İstanbul/New York'ta birebir aynı (hydration güvenli). PostgREST 1000 satır sınırı için sunucu sorgusu sayfalanıyor. Tek kesit varken hata değil, ne yapılacağını söyleyen bir açıklama çıkıyor.

### Son İşlem — Hotfix: Raporlar'da Server Components render hatası (2026-09-09)
Adım 3 canlıya çıkınca sayfa "An error occurred in the Server Components render" veriyordu. Sebep: `raporlar/page.tsx` bir Server Component ama `satirlariKesiteCevir`'i `"use client"` işaretli `kesit-db.ts`'ten alıp **sunucuda çağırıyordu**. App Router'da böyle bir import gerçek fonksiyonu değil istemci referansını verir; çağrı `is not a function` ile patlar. TypeScript bu sınırı modellemediği için build temiz geçmişti. Saf dönüştürme fonksiyonu `"use client"` içermeyen `kesit-map.ts`'e taşındı; `kesit-db.ts` yalnızca DB yazan istemci fonksiyonlarını tutuyor. Hata yerelde geçici bir Server Component ile birebir üretildi ve düzeltmeden sonra geçtiği doğrulandı. `client-only` paketi denendi ama bu durumu yakalamıyor (bir "use client" modülünü import etmek serbest; sorun export'u sunucuda çağırmak) — yanıltıcı olmasın diye kaldırıldı, yerine iki dosyanın başına açıklayıcı uyarı kondu.

### Son İşlem — Adım 3: kesit kaydetme + kurum eşleştirme (2026-09-09)
Migration canlıda çalıştırıldı (5 tablo doğrulandı). `kesit-db.ts` yazma/okuma katmanı: aynı `kesit_tarihi` varsa önce silinip yeniden yazılıyor (cascade), kurum id'leri geri alınıp alt tablolar bağlanıyor. `kesit-eslestirme.tsx` ekranı: her kurum için *mevcut okula bağla / yeni okul olarak ekle / bağlama*; otomatik eşleşenler işaretli, çakışanlar onaya düşüyor, yeni okullarda şehir zorunlu (kurum+şube adından tahmin ediliyor). Sayfa artık kayıtlı kesiti DB'den okuyor — yenileme veriyi kaybetmiyor. Tablolar yoksa sessizce boş görünmek yerine ne yapılacağını söyleyen uyarı çıkıyor. Tiplerin gerçek şemayla eşleştiği PostgREST üzerinden doğrulandı (5 tablo, 60+ kolon). **Kaydetme işlemi giriş gerektirdiği için uçtan uca test edilemedi — kullanıcı denemeli.**

### Son İşlem — Faz 2 İş 1 yeniden (2026-09-09)
Kapatılan PR #11 çakışma yüzünden kapatılmıştı; eski dalı diriltmek yerine güncel `main`'den temiz baştan yapıldı. Kapsam bu arada küçüldü: `report-client.ts` ve eski `raporlar/page.tsx` #15'te zaten silindi/yeniden yazıldı. Kalan gerçek iş — `types/database.ts`'e `report_uploads.format` ve `trainings.default_trainer_id`; `notif-client.ts` paylaşılan typed client'a bağlandı; `okullar/page.tsx`'teki tipsiz `sb` ve gereksiz cast'ler, `contract-form.tsx`'teki `as never`/`as any` kaldırıldı. Dokunulan dört dosyada sıfır cast, sıfır uyarı. Kalan 35 uyarı planın kapsam dışı bıraktığı eski modüllerde.

### Son İşlem — Eski sekmeler kaldırıldı + Kurum Dağılımı grafiği (2026-09-09)
Adım 9'un kod tarafı yapıldı: "Öğretmen Özeti" ve "Kurs Bazlı" sekmeleri ve onlara bağlı 9 dosya silindi (Kurum Takip zaten iki formatı da okuyor). `/raporlar` 132 kB → 124 kB, First Load 294 → 220 kB. Tablolar henüz durup Adım 3 doğrulanınca düşecek. Yeni **Kurum Dağılımı** grafiği: 92 kurum tek SVG'de, yatayda öğretmen sayısı (log), dikeyde ilerleme; ağırlıklı ortalama çizgisi ve "ortalamanın altındaki en büyük kurumlar" kısayolu. Google Charts tercih edilmedi (gstatic bağımlılığı, PDF riski, sayfa ağırlığı). Grafik yazarken bir hydration hatası çıktı ve düzeltildi: SVG `<title>` içine çok çocuklu JSX konulunca React sunucuda `<!-- -->` ekliyor, tarayıcı `<title>`'ı ham metin ayrıştırdığı için bunu metin sayıyor ve hydration çöküyordu — tek metin düğümüne çevrildi. TZ=UTC prodüksiyon build'iyle doğrulandı: konsol temiz.

### Son İşlem — Sekme değişiminde kesit kaybolması düzeltildi (2026-09-09)
Kurum Takip'e dosya yüklendikten sonra başka sekmeye geçip dönünce veriler siliniyordu: `KesitPanosu` koşullu render ediliyordu, React bileşeni söküyor ve state'i onunla gidiyordu. Kesit henüz DB'ye yazılmadığı için (Adım 3) tek kopyası o state'te. Bileşen artık her zaman monte kalıyor, yalnızca `hidden` ile gizleniyor. Tarayıcıda doğrulandı: diğer sekmedeyken DOM'da duruyor, geri dönünce görünür oluyor.

### Son İşlem — Kurum ↔ Okul eşleştirici (2026-09-09)
Rapordaki kurum adları CRM'deki okul adlarıyla sistematik olarak farklı yazılıyor ("ALKEV Özel Okulları" ↔ "ALKEV", "İTÜ GVO İzmir" ↔ "İzmir İTÜ GVO"); birebir eşleştirme neredeyse hiçbirini yakalamıyor. `kurum-eslestir.ts` yazıldı: genel kelimeleri ("özel", "okulları", "koleji"…) atıp kalan ayırt edici kelime kümesini Jaccard ile karşılaştırıyor. Gerçek verilerle test: 15 kurumdan 11'i kesin eşleşti, 4'ü doğru şekilde eşleşmedi (Afyon İsabet ≠ İsabet Trabzon, Final Akademi ≠ Final Okulları). Alt küme eşleşmesi bilerek reddediliyor. Toplu eşleştirmede iki kurum aynı okula talip olursa ikisi de "onay gerekir"e düşüyor — sessizce yanlış bağlamak yerine. `schools.city` NOT NULL olduğu için şehir kurum/şube adından tahmin ediliyor, bulunamazsa kullanıcıdan istenecek.

### Son İşlem — Kurum Takip Adım 2: kesit tabloları (2026-09-09)
`20260909000000_kesit_tablolari.sql` hazırlandı — 5 tablo (`report_kesit`, `report_kurum`, `report_sube`, `report_egitim`, `report_sertifika_ay`) + indeksler + RLS (admin/operasyon). **SQL Editor'de çalıştırılmayı bekliyor.** Kurum↔okul bağlantısı `report_kurum.school_id` üzerinden: rapordaki kurum adı her zaman saklanır, ada göre eşleşen okula bağlanır, eşleşmeyen kayıt engellenmez (school_id NULL kalır, eşleştirme ekranına düşer). Yükleme tek yerden (Raporlar → Kurum Takip); Okullar sayfasından tek tek yükleme yok. Ayrıca dev ortamı sorunu çözüldü: `npm run build` sonrası kalan prodüksiyon `.next`'i üzerine `next dev` gelince CSS 500 dönüyordu — `.next` silinip temiz başlatıldı.

### Son İşlem — Kurum Takip: Şube ve Eğitim Analizi (2026-09-08)
Planın Adım 6'sı yapıldı. Kurum Takip sekmesine iç sayfa çubuğu eklendi: **Kurum Karşılaştırma · Şube Analizi · Eğitim Analizi**; kurum adına tıklayınca o kurumun markalı raporu açılıyor. Şube Analizi tüm kurumların şubelerini tek tabloda gösteriyor (kurum filtresi, sıralanabilir, "Hiç Başlamayan %" ters renk skalası). Eğitim Analizi eğitimleri kurumlar arası topluyor, en düşük tamamlanma üstte. Özet dökümde eğitim adı olmadığı için Eğitim Analizi açıklayıcı bir boş durum gösteriyor — detaylı döküm isteniyor. Sentetik veriyle iki formatta da doğrulandı.

### Son İşlem — Kurum Takip: iki döküm formatı (2026-09-08)
Kullanıcı platformdan hem detaylı (Eğitim sütunlu) hem özet (Tamamlanan/Devam Eden sütunlu) döküm alabildiğini belirtti. Kesit modeli ikisini de kabul edecek şekilde genişletildi; format sütun başlıklarından otomatik anlaşılıyor, kullanıcı bir şey seçmiyor. Özet dökümde üretilemeyen alanlar (`egitimSayisi`, `sertifikaSayisi`, `sertifikaAlan`) tip düzeyinde `number | null` — ekranda "—" gösteriliyor, sıfır uydurulmuyor. Her iki format Node'da test edildi: detaylı döküm GEN Koleji'nde Excel'le birebir, özet döküm sentetik veriyle çalışıyor, ikisinin de çıktısında kişisel veri yok.

### Son İşlem — Kurum Takip: Adım 1 + Kurum Karşılaştırma (2026-09-08)
Kesit hesaplama katmanı (`kesit.ts`) ve Excel okuyucu (`kesit-parse.ts`) yazıldı; Raporlar'a "Kurum Takip" sekmesi eklendi (Kurum Karşılaştırma tablosu + kurum detay raporu). Kişisel veri tip düzeyinde dışarıda: `HamSatir`'da ad-soyad yok, çıktı tiplerinde kişiye ait tek alan yok — 8.294 satırlık girdi 9 KB'lık sayı özetine iniyor, içinde tek `@` bile yok. Kaynak Excel'in kendi hesapladığı 30 değerle karşılaştırıldı: 29'u birebir, 1'i (BİLNET tamamlanma oranı, %78,93 vs %78,96) planda öngörülen öğretmen-düzeyi/satır-düzeyi farkı — atama eşitsizliği olan tek kurum orası. Parser tüm sayfaları tarıyor (takip panosunda "Ham Veri" 9. sayfa). **Kaydetme henüz yok** — Adım 2 (şema) bekliyor.

### Son İşlem — Kurum Eğitim Takip Panosu Planı v2 (2026-09-08)
`TeacherX_Kurum_Egitim_Takip_Panosu.xlsx` incelendi; `PLAN_KURUM_TAKIP_PANOSU.md` kullanıcı yönlendirmesiyle yeniden yazıldı. Temel ilke: **girdi değil, üretilen çıktı saklanır** — kişi bazlı hiçbir bilgi (ad, e-posta, kişi ilerlemesi) DB'ye yazılmaz, rapora girmez; risk listesi ve isimli Öğretmen Listesi PDF'i kaldırılacak. JSONB blob yerine gerçek kolonlu 5 tablo (`report_kesit`, `report_kurum`, `report_sube`, `report_egitim`, `report_sertifika_ay`) — üretimde JSONB şema kayması çöktürmüştü ve kurumlar arası sorgu SQL'e inemiyordu. Belirsiz `avgCompletion` yerine iki ayrı metrik: `ilerleme_ortalamasi` (kısmi sayılır) ve `tamamlanma_orani` (sayılmaz), ikisi de öğretmen düzeyinden. 9 adımlık iş sırası çıkarıldı; onay bekliyor.

### Son İşlem — Hotfix: Raporlar'da hydration çökmesi (2026-09-08)
Deploy sonrası `/raporlar` "Application error: a client-side exception has occurred" veriyordu. Sebep: tarihler `toLocaleString("tr-TR")` ile timeZone verilmeden biçimleniyordu — Vercel sunucuları UTC, tarayıcı UTC+3 → SSR ve client farklı metin üretiyor → React #425/#418/#423. Yerelde görünmüyordu çünkü geliştirme makinesi de UTC+3. `lib/utils.ts`'e `TR_TZ` + `formatDateTime` eklendi, tüm tarih biçimlemeleri `Europe/Istanbul`a sabitlendi (raporlar, bildirim zili, ekip). `TZ=UTC` prodüksiyon build'i + UTC+3 tarayıcıyla yeniden üretildi ve doğrulandı: konsol temiz.

### Son İşlem — Raporlar: TeacherX Rapor Kimliği + Gizlilik Ayrımı (2026-09-08)
Raporlar sayfası `kurum_raporu.py` çıktılarının görünümüne geçirildi: siyah üst şerit, marka paleti (`#E70917`/`#101010`/`#F4F2EE`), Poppins başlık + Inter gövde, üstten çizgili KPI kartları, halka grafik, yatay şube barları, sütun dağılımı, satır içi barlı tablolar. Grafikler saf SVG/CSS — recharts kaldırıldı, `/raporlar` 236 kB → 124 kB. **Gizlilik:** KULLANIM.md'nin "kurum raporu isim içermez" kuralı uygulandı — çıktı ikiye ayrıldı (`data-print="kurum"` isimsiz / `data-print="liste"` isimli). Öğretmen listesi yalnızca oturum belleğindeki ham satırlardan üretilir, DB'ye yazılmaz.

### Son İşlem — Raporlar: Öğretmen Özeti Formatı (2026-09-08)
Raporlar sayfası yalnızca kurs-bazlı Excel'i (Kurs + Sertifika Tarihi sütunlu) okuyabiliyordu; platformdan gelen öğretmen-bazlı özet (Adı Soyadı · Tamamlanan · Devam Eden · Tamamlama %) hata vermeden yükleniyor ama sessizce yanlış sayı üretiyordu (sentetik testte ort. tamamlama %54 yerine %20). Sayfa "Öğretmen Özeti" / "Kurs Bazlı" iki sekmeye ayrıldı; yeni format için ayrı parser + KPI/grafik seti (medyan, kurs-ağırlıklı tamamlama, % ve kurs-adedi dağılımları, şube tablosu, risk listesi) ve `window.print()` tabanlı PDF çıktısı eklendi. `report_uploads.format` kolonu ile iki rapor birbirini ezmiyor (migration `20260908000000_rapor_format_ayrimi.sql` — **SQL Editor'de çalıştırılmalı**, uygulanana kadar sayfa uyarı gösterir).

### Son İşlem — Lint Onarımı + PROGRESS Senkronu (2026-09-08)
`npm run lint` ESLint 9 / eslint-config-next 16 ile Next 14 arasındaki uyumsuzluk yüzünden hiç çalışmıyordu; `eslint@8` + `eslint-config-next@14.2.35`'e hizalandı ve ortaya çıkan 15 gerçek hata düzeltildi (6 ternary-as-statement, 4 ölü değişken/import, 3 kaçırılmamış apostrof, 2 shadcn override). `PROGRESS.md` 2026-06-19'dan beri bayattı ("Faz 0 bekliyor", "Supabase credentials eksik") — gerçek duruma göre yeniden yazıldı. Seed'de kalan `trainings.default_trainer_id` DDL'i `20260827000000_trainings_default_trainer.sql` olarak kayda geçirildi. type-check + build temiz.

### Son İşlem — Okul→Eğitim Atamaları Seed (2026-08-27)
24 okul sayfasından 180 atama `supabase/seed/26-27-atamalar.sql` olarak üretildi (fuzzy eşleştirme: tüm okul+eğitim eşleşti, 0 eşleşmeyen). Ön koşul: kurumlar + katalog seed'leri önce yüklenmeli. FMV Işık'ın 26-27 listesi elle verilen 5 eğitimle eklendi (tarihsiz); Matfen'in 5 satırı kaynakta geçersiz tarih (31.09) → scheduled_date NULL. status hepsi 'planlanmis', assigned_to=operasyon (COALESCE admin/any).

### Son İşlem — Eğitim Kataloğu + Eğitmenler Seed (2026-08-27)
69 eğitim + 56 tekil eğitmen `supabase/seed/egitim-katalogu.sql` olarak hazırlandı (contacts[egitmen] + trainers + trainings). Eğitim→eğitmen ilişkisinin şemada yeri olmadığı için `trainings`'e additive `default_trainer_id` kolonu eklendi (migration + types güncellemesi bekliyor). category/format best-effort (format='cevrimici' varsayıldı). Dosya `.gitignore` kapsamında.

### Son İşlem — 26-27 Kurum Takip Listesi Aktarımı (2026-08-27)
Excel (61 kurum) analiz edildi. Uyan alanlar `supabase/seed/26-27-kurumlar.sql` olarak hazırlandı (61 schools + 59 contacts + 59 coordinators + 108 milestones; 10 şehir isimden dolduruldu). Dosya PII içerdiği için `.gitignore`'a alındı, SQL Editor'de çalıştırılacak. Şemada karşılığı olmayan alanlar (ürün/abonelik modeli, genişletilmiş onboarding checklist, şehir zenginleştirme) `PLAN_KURUM_VERISI.md`'de 3 özellik olarak raporlandı.

### Son İşlem — Kritik Sorunlar Çözüldü (2026-08-26)
npm install ile missing dependencies (recharts, xlsx) kuruldu; types/database.ts yenilenerek 3 yeni tablo (notifications, report_uploads, report_kurum_stats) ve lead_stage_enum yeni değerleri eklendi; report-upload.tsx TypeScript hataları düzeltildi. `npm run type-check` ✅ TEMIZ, `npm run build` ✅ BAŞARILI. Sistem şu an Faz 2 (PLAN_FOUNDATION_FAZ2.md) uygulanmaya hazır.

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
