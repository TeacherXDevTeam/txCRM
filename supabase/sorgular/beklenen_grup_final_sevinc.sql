-- ═══════════════════════════════════════════════════════════════════════════
-- İki yeni birleşik hedef grubu
--
--   "Final Okulları"  = Final Eğitim Kurumları + Final Akademi Eğitim Kurumları
--   "Sevinç Okulları" = Sevinç Koleji + Sevinç Anaokulları + Sevinç Eğitim Kurumları
--
-- Rapor kontrolü grubu görünce üyelerin TOPLAM öğretmenini grubun TOPLAM
-- hedefiyle karşılaştırır ve tek satır gösterir.
--
-- MEKTEBİM'DEN FARKI: orada 4000'lik tek bir pazarlık hedefi vardı ve tek
-- üyede tutuldu. Burada okulların kendi hedefleri zaten girili; hesap
-- (sapmaHesapla) üyelerin hedeflerini topladığı için hedefleri tek üyeye
-- taşımaya GEREK YOK. Taşımamak hem veriyi korur hem de "lider"i seçme
-- adımını ortadan kaldırır — ki o adım burada zaten güvenilmez:
-- "Sevinç Koleji" ile "Sevinç Eğitim Kurumları" normalleştirmede aynı
-- değere ('sevinc') iniyor, birbirinden ayırt edilemiyorlar.
--
-- Bu yüzden eşleştirme TAM AD ile yapılır, normalleştirme ile değil.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) KEŞİF — önce bunu çalıştırın ────────────────────────────────────────
-- CRM'deki adların aşağıdaki listelerle birebir aynı olduğunu doğrulayın.
-- Ad farklıysa (ör. "Özel Sevinç Koleji") 2. adım o satırı ATLAR ve sessizce
-- eksik grup kurulur; bu yüzden önce bakılır.
select id, name, status, beklenen_ogretmen_sayisi, beklenen_grup
from schools
where name ilike '%final%' or name ilike '%sevin%'
order by name;

-- ── 2) ATAMA ──────────────────────────────────────────────────────────────
begin;

update schools
set beklenen_grup = 'Final Okulları', updated_at = now()
where name in ('Final Eğitim Kurumları', 'Final Akademi Eğitim Kurumları');

update schools
set beklenen_grup = 'Sevinç Okulları', updated_at = now()
where name in ('Sevinç Koleji', 'Sevinç Anaokulları', 'Sevinç Eğitim Kurumları');

-- Beklenen satır sayısı: Final 2, Sevinç 3. Tutmuyorsa COMMIT ETMEYİN,
-- `rollback;` yazıp 1. adımdaki adlara göre listeyi düzeltin.
select beklenen_grup, count(*) as okul_sayisi,
       string_agg(name, ' · ' order by name) as okullar
from schools
where beklenen_grup in ('Final Okulları', 'Sevinç Okulları')
group by beklenen_grup;

commit;

-- ── 3) DOĞRULAMA ──────────────────────────────────────────────────────────
-- Her grubun toplam hedefi ve üye hedefleri. Hedefi NULL olan üye varsa
-- grup hedefi eksik hesaplanır — o okulun hedefini girin.
select beklenen_grup,
       count(*)                                   as okul,
       count(beklenen_ogretmen_sayisi)            as hedefi_girili,
       sum(beklenen_ogretmen_sayisi)              as grup_hedefi,
       string_agg(name || ' (' || coalesce(beklenen_ogretmen_sayisi::text, 'hedefsiz') || ')',
                  ' · ' order by name)            as detay
from schools
where beklenen_grup is not null
group by beklenen_grup
order by beklenen_grup;
