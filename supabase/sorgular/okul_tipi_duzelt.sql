-- Mevcut okulların tipini düzeltmek.
-- TeacherX'in çalıştığı kurumların tamamı özel; şema varsayılanı 'devlet'
-- olduğu için tipi belirtilmeden açılan kayıtlar yanlış etiketlendi.
--
-- ÖNCE BAK, SONRA DEĞİŞTİR.

-- 1) Şu an ne var?
select school_type, count(*) as okul_sayisi
from schools
group by school_type
order by okul_sayisi desc;

-- 2) 'devlet' görünenler — gerçekten devlet okulu olan var mı, gözden geçirin.
select name, city, status, created_at::date
from schools
where school_type = 'devlet'
order by name;

-- 3) Hepsini özele çevir. 2. adımda gerçek bir devlet okulu gördüyseniz
--    önce onu ayırın, ya da bu sorguya `and name <> '...'` ekleyin.
update schools
set school_type = 'ozel', updated_at = now()
where school_type = 'devlet';

-- 4) Doğrula
select school_type, count(*) from schools group by school_type;
