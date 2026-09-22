-- Okul bazında "olması gereken öğretmen sayısı" (2026-2027 sezon hedefi).
-- Rapor yüklendiğinde gerçek öğretmen sayısıyla karşılaştırmak için kullanılır.
-- contracts.expected_teacher_count'tan ayrıdır: bu, rapor kontrolünün esas aldığı
-- okul-düzeyi hedeftir (sözleşme satırı olmasa da erişilebilir).
ALTER TABLE schools ADD COLUMN IF NOT EXISTS beklenen_ogretmen_sayisi integer;

COMMENT ON COLUMN schools.beklenen_ogretmen_sayisi IS
  'Sezon hedefi: olması gereken öğretmen sayısı. Rapor kontrolü bununla karşılaştırır.';
