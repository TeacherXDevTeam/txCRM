-- Okul grubu: birden çok okulun tek bir birleşik öğretmen hedefi paylaşması.
-- Grup üyelerinden yalnız biri beklenen_ogretmen_sayisi taşır (grup hedefi);
-- rapor kontrolü grup üyelerinin TOPLAM öğretmenini bu hedefle karşılaştırır.
-- Örn: "Mektebim Grubu" = Girne + Mektebim + Kavram + BİL + Anakent, hedef 4000.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS beklenen_grup text;

COMMENT ON COLUMN schools.beklenen_grup IS
  'Birleşik hedef grubu adı. Aynı gruptaki okulların öğretmenleri toplanıp tek hedefle karşılaştırılır.';
