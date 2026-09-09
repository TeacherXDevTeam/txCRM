-- Okul profillerindeki eksikleri döker.
-- Supabase → SQL Editor → çalıştır → sonuç tablosunun üstündeki
-- "Download CSV" ile indir. Hiçbir şeyi değiştirmez.
--
-- Çıkan CSV'yi şuraya verin:
--   node scripts/okul-veri-sablonu.mjs okullar.csv
-- Doldurulacak bir Excel üretir.

select
  s.id,
  s.name                                    as okul_adi,
  coalesce(s.city, '')                      as il,
  coalesce(s.district, '')                  as ilce,
  s.school_type                             as okul_tipi,
  s.status                                  as durum,
  (select count(*) from coordinators c where c.school_id = s.id)          as koordinator_sayisi,
  (select count(*) from contracts   k where k.school_id = s.id)           as sozlesme_sayisi,
  (select max(k.expected_teacher_count) from contracts k
     where k.school_id = s.id)                                            as beklenen_ogretmen,
  (select max(k.end_date) from contracts k where k.school_id = s.id)      as sozlesme_bitis
from schools s
order by s.name;
