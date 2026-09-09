-- "Pasif işaretlediğim kurum aktif görünüyor" — nedenini bulmak için.
-- Supabase → SQL Editor. Hiçbir şeyi DEĞİŞTİRMEZ, yalnızca okur.

-- 1) Durum dağılımı ve okulların ne zaman oluştuğu.
--    İçe aktarma ile açılan okullar, elle girilenlerden created_at ile ayrılır.
select status,
       count(*)                          as okul_sayisi,
       min(created_at)::date              as en_eski,
       max(created_at)::date              as en_yeni
from schools
group by status
order by okul_sayisi desc;

-- 2) MÜKERRER ŞÜPHESİ: adının ilk kelimesi aynı olan okullar.
--    "BİLNET" ile "BİLNET Okulları" ayrı iki kayıtsa burada yan yana çıkar.
with ilk as (
  select id, name, status, created_at,
         lower(split_part(trim(name), ' ', 1)) as anahtar
  from schools
)
select anahtar,
       count(*) as kayit,
       string_agg(name || ' [' || status || ' · ' || created_at::date || ']', '  |  '
                  order by created_at) as kayitlar
from ilk
group by anahtar
having count(*) > 1
order by count(*) desc, anahtar;

-- 3) Aranan kurumu doğrudan bul (deseni değiştirin).
select id, name, status, city, district, created_at
from schools
where name ilike '%bilnet%'
order by created_at;

-- 4) Bu okul kesitlerde geçiyor mu, hangi tarihlerde?
--    Geçmiş kesitte var ama güncelde yoksa: ayrılmış kurum.
select s.name,
       s.status,
       k.kesit_tarihi,
       r.kurum_adi   as rapordaki_ad,
       r.ogretmen_sayisi
from schools s
join report_kurum r on r.school_id = s.id
join report_kesit k on k.id = r.kesit_id
where s.name ilike '%bilnet%'
order by k.kesit_tarihi desc;

-- 5) YALNIZ GEÇMİŞ KESİTTE olan okullar — bunlar artık çalışılmıyor olabilir.
--    Durumu 'aktif' görünenler gözden geçirilmeli.
with guncel as (select max(kesit_tarihi) as t from report_kesit)
select s.name, s.status, max(k.kesit_tarihi) as son_gorulme
from schools s
join report_kurum r on r.school_id = s.id
join report_kesit k on k.id = r.kesit_id
group by s.id, s.name, s.status
having max(k.kesit_tarihi) < (select t from guncel)
order by s.status, s.name;
