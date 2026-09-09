-- Bir kesiti silmek.
-- Supabase → SQL Editor. GERİ ALINAMAZ.
--
-- Not: Raporlar → "Kesitler" sekmesi bunu arayüzden yapıyor. Bu dosya, o
-- ekran yayına çıkmadan önce ya da toplu bir temizlik gerektiğinde işe yarar.
--
-- report_kesit üzerindeki ON DELETE CASCADE, o kesite bağlı kurum / şube /
-- eğitim / sertifika satırlarını da siler. Okul kayıtları (schools) etkilenmez;
-- report_kurum.school_id yalnızca bir referanstı.

-- 1) ÖNCE BAK: hangi kesitler var, hangisi ne kadar veri tutuyor?
select k.kesit_tarihi,
       k.dosya_adi,
       k.kaynak_satir,
       count(r.id)                    as kurum_sayisi,
       coalesce(sum(r.ogretmen_sayisi), 0) as ogretmen_sayisi
from report_kesit k
left join report_kurum r on r.kesit_id = k.id
group by k.id, k.kesit_tarihi, k.dosya_adi, k.kaynak_satir
order by k.kesit_tarihi desc;

-- 2) SONRA SİL: tarihi kendi durumunuza göre değiştirin.
--    Yukarıdaki listede o satırın gerçekten silmek istediğiniz kesit
--    olduğunu doğrulamadan çalıştırmayın.
delete from report_kesit
where kesit_tarihi = '2026-10-31';

-- 3) DOĞRULA: kalan kesitler
select kesit_tarihi, dosya_adi from report_kesit order by kesit_tarihi desc;
