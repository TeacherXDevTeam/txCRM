# TeacherX CRM — AI Engineering Workflow

Adapted from [gstack](https://github.com/garrytan/gstack) by Garry Tan.
These skills give AI agents structured roles for building the txCRM platform.

## Available Skills

### Plan-mode reviews

| Skill | Ne yapar |
|-------|----------|
| `/office-hours` | Buradan başla. Bir fikri koda dökmeden önce yeniden çerçevele. |
| `/plan-ceo-review` | CEO perspektifi: bu feature'ın 10 yıldızlı versiyonu nedir? |
| `/plan-eng-review` | Mimariyi, veri akışını, edge case'leri ve testleri kilitle. |
| `/plan-design-review` | Her tasarım boyutunu 0-10 puanla, 10'un nasıl göründüğünü açıkla. |
| `/autoplan` | Tek komutla CEO → design → eng review zincirini çalıştır. |
| `/spec` | Belirsiz niyeti 5 aşamada kesin, çalıştırılabilir bir spec'e dönüştür. |

### Implementation + review

| Skill | Ne yapar |
|-------|----------|
| `/review` | PR merge öncesi inceleme. CI'ı geçen ama prod'da kıran bug'ları bulur. |
| `/investigate` | Sistematik kök-neden debug. Araştırma olmadan düzeltme yapma. |
| `/design-review` | Canlı site görsel denetimi + düzeltme döngüsü, atomik commit'ler. |
| `/qa` | Gerçek bir tarayıcı aç, bug bul, düzelt, yeniden doğrula. |
| `/qa-only` | /qa ile aynı metodoloji — sadece rapor, kod değişikliği yok. |

### Release + deploy

| Skill | Ne yapar |
|-------|----------|
| `/ship` | Testleri çalıştır, incele, push et, PR aç. |
| `/land-and-deploy` | PR'ı merge et, CI ve deploy'u bekle, prod sağlığını doğrula. |
| `/document-release` | Tüm dokümanları az önce ship ettiğin şeyle güncelle. |
| `/setup-deploy` | Tek seferlik deploy konfigürasyonu algıla (Vercel). |

### Operational

| Skill | Ne yapar |
|-------|----------|
| `/context-save` | Çalışma bağlamını kaydet (git durumu, kararlar, kalan iş). |
| `/context-restore` | Kaydedilmiş bağlamdan devam et. |
| `/health` | Kod kalitesi panosu (type checker, linter, testler, ölü kod). |
| `/cso` | OWASP Top 10 + STRIDE güvenlik denetimi. |
| `/retro` | Haftalık retrospektif. |

### Safety + scoping

| Skill | Ne yapar |
|-------|----------|
| `/careful` | Yıkıcı komutlar öncesi uyar (rm -rf, DROP TABLE, force-push). |
| `/freeze` | Düzenlemeleri tek bir dizinle kısıtla. Uyarı değil, sert blok. |
| `/guard` | careful + freeze'i aynı anda etkinleştir. |
| `/unfreeze` | Dizin düzenleme kısıtlamalarını kaldır. |
| `/diagram` | İngilizce/Türkçe gir, diyagram al: mermaid + excalidraw + SVG/PNG. |

---

## Önerilen Workflow

```
Yeni feature:
  /office-hours → /plan-eng-review → implement → /review → /qa → /ship

Bug fix:
  /investigate → implement → /review → /ship

Tasarım değişikliği:
  /plan-design-review → implement → /design-review → /qa → /ship

Güvenlik denetimi:
  /cso → /review → fix → /ship
```

---

## txCRM'e Özel Notlar

- **PRD her zaman otorite.** Bir skill PRD'ye aykırı bir şey önerirse, kullanıcı
  onayı olmadan uygulanmaz (bkz. `ETHOS.md §3 User Sovereignty`).
- **Supabase migration'ları dikkatli yönet.** `supabase/migrations/` altındaki
  dosyaları elle düzenleme; her şema değişikliği yeni bir migration dosyasıdır.
- **RLS test et.** Her yeni tablo için viewer/member/admin rollerini ayrı ayrı
  doğrula — CI'da RLS testleri bulunmalı.
- **Türkçe enum değerleri.** PRD'deki slug'ları koru (`kapandi_kazanildi`,
  `yuz_yuze`, `tamamlandi` vb.). Bunları refactor etme.
