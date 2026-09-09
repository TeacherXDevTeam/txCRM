-- Kesitteki kurumların okullarla eşleşme durumu.
-- Supabase → SQL Editor'de çalıştırın. Hiçbir şeyi değiştirmez, yalnızca okur.

-- 1) Özet: kaç kurum bağlı, kaç kurum bağlanmamış?
select
  k.kesit_tarihi,
  count(*)                                     as kurum_sayisi,
  count(r.school_id)                           as okula_bagli,
  count(*) - count(r.school_id)                as baglanmamis,
  (select count(*) from schools)               as sistemdeki_okul_sayisi
from report_kurum r
join report_kesit k on k.id = r.kesit_id
group by k.kesit_tarihi
order by k.kesit_tarihi desc;

-- 2) Bağlanmamış kurumlar — "yeni okul olarak eklenmesi" gerekenler
select r.kurum_adi, r.ogretmen_sayisi, r.sube_sayisi
from report_kurum r
join report_kesit k on k.id = r.kesit_id
where r.school_id is null
  and k.kesit_tarihi = (select max(kesit_tarihi) from report_kesit)
order by r.ogretmen_sayisi desc;

-- 3) Okulların şehir alanı gerçekten dolu mu?
--    (city NOT NULL ama boş string'e izin veriyor)
select
  count(*)                                              as toplam,
  count(*) filter (where coalesce(city,'') = '')        as sehri_bos,
  count(*) filter (where city = 'Belirtilmedi')         as sehri_belirtilmedi
from schools;
