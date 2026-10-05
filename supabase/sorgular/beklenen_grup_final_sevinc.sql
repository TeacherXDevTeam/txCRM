-- ═══════════════════════════════════════════════════════════════════════════
-- Birleşik hedef grupları: "Final Okulları" ve "Sevinç Okulları"
--
-- İLK SÜRÜM NEDEN TUTMADI
-- Okulları `schools.name` üzerinden eşlemeye çalışmıştım. Panodaki adlar
-- RAPORDAKİ kurum adları (report_kurum.kurum_adi); CRM'deki okul adı farklı
-- yazılmış olabiliyor, o yüzden tam ad eşleşmesi hiçbir satır bulmadı ve
-- gruplar sessizce kurulmadı.
--
-- Bu sürüm okulları RAPOR BAĞLANTISI üzerinden buluyor: hangi okul bu kurum
-- adına bağlanmışsa o. Panoda gördüğünüz adı kullandığımız için eşleşme
-- kesin.
--
-- İKİNCİ DÜZELTME: HEDEF TEKRARI
-- Panoda iki Final satırı da "beklenen 2.908", iki Sevinç satırı da "500"
-- gösteriyordu: grup toplamı her üyeye ayrı ayrı girilmiş. Üyelerin
-- hedeflerini toplasaydık grup hedefi İKİYE KATLANIRDI (5.816). Bu yüzden
-- hedef tek üyede toplanıyor, diğerleri NULL yapılıyor — Mektebim'deki
-- düzenin aynısı.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) KEŞİF — önce bunu çalıştırın ────────────────────────────────────────
-- Rapordaki kurum adı, bağlı olduğu CRM okulu ve o okulun hedefi.
-- school_id boşsa o kurum hiçbir okula bağlı değildir: önce Raporlar →
-- Eşleştirme'den bağlanması gerekir, yoksa gruba da giremez.
select r.kurum_adi                       as rapordaki_ad,
       s.name                            as crm_okul_adi,
       s.beklenen_ogretmen_sayisi        as hedef,
       s.beklenen_grup                   as mevcut_grup,
       r.ogretmen_sayisi                 as raporda_ogretmen
from report_kurum r
left join schools s on s.id = r.school_id
where r.kesit_id = (select id from report_kesit order by kesit_tarihi desc limit 1)
  and (r.kurum_adi ilike '%final%' or r.kurum_adi ilike '%sevin%')
order by r.kurum_adi;

-- ── 2) ATAMA ──────────────────────────────────────────────────────────────
begin;

update schools set beklenen_grup = 'Final Okulları', updated_at = now()
where id in (
  select distinct r.school_id from report_kurum r
  where r.school_id is not null
    and r.kurum_adi in ('Final Eğitim Kurumları', 'Final Akademi Eğitim Kurumları')
);

update schools set beklenen_grup = 'Sevinç Okulları', updated_at = now()
where id in (
  select distinct r.school_id from report_kurum r
  where r.school_id is not null
    and r.kurum_adi in ('Sevinç Koleji', 'Sevinç Anaokulları', 'Sevinç Eğitim Kurumları')
);

-- Üyelerde FARKLI hedefler varsa dur: hangisinin grup hedefi olduğunu
-- bilemeyiz, tahmin etmek yanlış sayı üretir.
do $$
declare g text; n int;
begin
  foreach g in array array['Final Okulları', 'Sevinç Okulları'] loop
    select count(distinct beklenen_ogretmen_sayisi) into n
    from schools where beklenen_grup = g and beklenen_ogretmen_sayisi is not null;
    if n > 1 then
      raise exception '% üyelerinde % farklı hedef var. Grup hedefinin hangisi olduğuna karar verip bu bloğu elle düzeltin.', g, n;
    end if;
  end loop;
end $$;

-- Hedefi tek üyede topla (ada göre ilk üye), diğerlerini boşalt.
-- Değerler aynı olduğu için max() = grup hedefi.
update schools s
set beklenen_ogretmen_sayisi = case
      when s.id = (select id from schools x where x.beklenen_grup = s.beklenen_grup order by x.name limit 1)
      then (select max(beklenen_ogretmen_sayisi) from schools y where y.beklenen_grup = s.beklenen_grup)
      else null
    end,
    updated_at = now()
where s.beklenen_grup in ('Final Okulları', 'Sevinç Okulları');

-- Kontrol: Final 2, Sevinç 3 okul; her grupta hedefi girili TEK üye olmalı.
-- Tutmuyorsa `rollback;` yazın.
select beklenen_grup,
       count(*)                        as okul,
       count(beklenen_ogretmen_sayisi) as hedefi_girili_uye,
       max(beklenen_ogretmen_sayisi)   as grup_hedefi,
       string_agg(name || ' (' || coalesce(beklenen_ogretmen_sayisi::text, '—') || ')', ' · ' order by name) as detay
from schools
where beklenen_grup in ('Final Okulları', 'Sevinç Okulları')
group by beklenen_grup;

commit;

-- ── 3) DOĞRULAMA — tüm gruplar ────────────────────────────────────────────
select beklenen_grup, count(*) as okul, max(beklenen_ogretmen_sayisi) as grup_hedefi,
       string_agg(name, ' · ' order by name) as okullar
from schools where beklenen_grup is not null
group by beklenen_grup order by beklenen_grup;
