import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/*
 * Testler yalnız SAF modülleri hedefler: iş kurallarının yaşadığı yer orası.
 * React bileşenleri ve Supabase'e yazan katman kapsam dışı — onların testi
 * ayrı bir altyapı (jsdom, test veritabanı) ister ve asıl riski taşımıyorlar.
 *
 * Riskin nerede olduğunu bu proje zaten gösterdi: yanlış çıkan şeyler hep
 * hesap kurallarıydı (ağırlıklı ortalama, sabit sepet, null yayılımı,
 * eşleştirme eşiği), ekran değil.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
