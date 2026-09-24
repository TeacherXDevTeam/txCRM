-- "Profil Tamamlama hepsini eksik gösteriyor" — nedenini bulmak için.
-- Supabase → SQL Editor. Hiçbir şeyi DEĞİŞTİRMEZ, yalnızca okur.

-- 1) Sayılar: ekranda gördüğünüzle karşılaştırın.
select
  (select count(*) from schools)                                          as okul,
  (select count(*) from schools where beklenen_ogretmen_sayisi is not null) as hedefi_olan,
  (select count(*) from schools where beklenen_grup is not null)           as gruplu,
  (select count(distinct school_id) from coordinators)                     as koordinatorlu,
  (select count(*) from contracts)                                        as sozlesme_satiri,
  (select count(distinct school_id) from contracts)                       as sozlesmeli_okul;

-- 2) Sözleşmeler gerçekten duruyor mu, ne zaman açılmış?
select date(created_at) as gun, status, count(*) as adet,
       min(start_date) as ilk_baslangic, max(end_date) as son_bitis
from contracts
group by date(created_at), status
order by gun desc;

-- 3) Beklenen öğretmen nerede tutuluyor?
--    Eski akış sözleşmeye, yeni akış okula yazıyor. İkisini karşılaştırın.
select
  count(*) filter (where s.beklenen_ogretmen_sayisi is not null) as okulda_hedef,
  count(*) filter (where k.expected_teacher_count is not null)   as sozlesmede_hedef
from schools s
left join contracts k on k.school_id = s.id;

-- 4) Hangi okullarda sözleşme yok? (ilk 30)
select s.name, s.status, s.beklenen_ogretmen_sayisi, s.beklenen_grup
from schools s
where not exists (select 1 from contracts k where k.school_id = s.id)
order by s.status, s.name
limit 30;
