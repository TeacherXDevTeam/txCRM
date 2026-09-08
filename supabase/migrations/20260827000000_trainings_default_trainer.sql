-- Eğitim → varsayılan eğitmen eşlemesi
--
-- KAYIT AMAÇLI MIGRATION. Bu DDL, 2026-08-27 tarihli eğitim katalogu seed'i
-- (`supabase/seed/egitim-katalogu.sql`, PII nedeniyle gitignored) içinde
-- paylaşılan canlı DB'ye SQL Editor üzerinden uygulanmıştı; migration klasöründe
-- karşılığı yoktu. Şema kaymasını kapatmak için buraya alındı.
--
-- Idempotent (IF NOT EXISTS) — zaten uygulanmış ortamlarda tekrar çalıştırmak güvenlidir.

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS default_trainer_id UUID
  REFERENCES trainers(id) ON DELETE SET NULL;

COMMENT ON COLUMN trainings.default_trainer_id IS
  'Bu eğitimi normalde veren eğitmen. Atama oluştururken ön-doldurma için kullanılır; atamanın kendi trainer_id''si bağlayıcıdır.';
