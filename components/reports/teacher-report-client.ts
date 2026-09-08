"use client";

// Öğretmen-özeti raporu (platform çıktısı: her satır = 1 öğretmen)
// Beklenen sütunlar: Adı Soyadı · E-posta · Kurum · Şube · Tamamlanan · Devam Eden · Tamamlama %
//
// Kurs-bazlı rapordan farkı: kurs kırılımı ve sertifika bilgisi yok, buna karşılık
// tamamlanan/devam eden adetleri ve platformun kendi hesapladığı yüzde hazır geliyor.
// Tüm hesaplama tarayıcıda çalışır; DB'ye yalnızca kurum bazlı sayısal özet yazılır.

export interface TeacherRow {
  ad: string;
  eposta: string;
  kurum: string;
  sube: string;
  tamamlanan: number;
  devamEden: number;
  yuzde: number; // 0..100 — platformun verdiği değer
}

export interface TeacherSubeStat {
  sube: string;
  ogretmen: number;
  ort: number;           // ortalama tamamlama %
  bitiren: number;       // %100'e ulaşan öğretmen
  tamamlananKurs: number;
}
export interface Bucket { aralik: string; sayi: number }
export interface TeacherRisk {
  ad: string;
  sube: string;
  yuzde: number;
  tamamlanan: number;
  devamEden: number;
}

export interface TeacherKurumStats {
  format: "ogretmen";
  teacherCount: number;
  totalCompleted: number;      // Σ tamamlanan
  totalInProgress: number;     // Σ devam eden
  enrollments: number;         // tamamlanan + devam eden
  avgCompletion: number;       // öğretmen başına düz ortalama (%)
  medianCompletion: number;    // medyan (%) — ortalamayı çarpıtan uçları görmek için
  weightedCompletion: number;  // Σ tamamlanan / Σ kayıt (%) — kurs ağırlıklı
  fullyCompleted: number;      // %100'e ulaşan öğretmen
  notStarted: number;          // hiç kurs bitirmemiş öğretmen
  avgCoursesPerTeacher: number;
  subeler: TeacherSubeStat[];
  pctBuckets: Bucket[];        // tamamlama % dağılımı
  countBuckets: Bucket[];      // tamamlanan kurs adedi dağılımı
  risk: TeacherRisk[];         // tamamlama < %50
  mergedDuplicates: number;    // aynı öğretmenin birleştirilen tekrar satırı
  pctMismatch: number;         // platform % ile adetlerden hesaplanan % uyuşmayan öğretmen
}

const PCT_BUCKETS: [string, (n: number) => boolean][] = [
  ["%0",      (n) => n <= 0],
  ["%1-25",   (n) => n > 0 && n <= 25],
  ["%26-50",  (n) => n > 25 && n <= 50],
  ["%51-75",  (n) => n > 50 && n <= 75],
  ["%76-99",  (n) => n > 75 && n < 100],
  ["%100",    (n) => n >= 100],
];

const COUNT_BUCKETS: [string, (n: number) => boolean][] = [
  ["0",     (n) => n === 0],
  ["1-5",   (n) => n >= 1 && n <= 5],
  ["6-10",  (n) => n >= 6 && n <= 10],
  ["11-15", (n) => n >= 11 && n <= 15],
  ["16+",   (n) => n >= 16],
];

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Satırları kuruma göre özetler. Aynı öğretmen (e-posta) birden çok satırda
 * geçiyorsa adetler toplanır, yüzde kayıt sayısına göre ağırlıklandırılır —
 * satır atmak yerine birleştirilir, kaç tanesinin birleştiği raporlanır.
 */
export function computeTeacherStatsByKurum(
  rows: TeacherRow[]
): { kurum: string; teacher_count: number; stats: TeacherKurumStats }[] {
  const byKurum = new Map<string, TeacherRow[]>();
  for (const r of rows) {
    const k = r.kurum || "—";
    if (!byKurum.has(k)) byKurum.set(k, []);
    byKurum.get(k)!.push(r);
  }

  const out: { kurum: string; teacher_count: number; stats: TeacherKurumStats }[] = [];

  for (const [kurum, krows] of byKurum) {
    // Öğretmen tekilleştirme (e-posta yoksa ada düş)
    const byTeacher = new Map<string, TeacherRow>();
    let mergedDuplicates = 0;
    for (const r of krows) {
      const key = (r.eposta || r.ad).toLowerCase();
      const prev = byTeacher.get(key);
      if (!prev) { byTeacher.set(key, { ...r }); continue; }
      mergedDuplicates++;
      const wPrev = prev.tamamlanan + prev.devamEden;
      const wCur = r.tamamlanan + r.devamEden;
      const wSum = wPrev + wCur;
      prev.tamamlanan += r.tamamlanan;
      prev.devamEden += r.devamEden;
      prev.yuzde = wSum > 0
        ? (prev.yuzde * wPrev + r.yuzde * wCur) / wSum
        : (prev.yuzde + r.yuzde) / 2;
      if (!prev.sube && r.sube) prev.sube = r.sube;
    }

    const teachers = [...byTeacher.values()];
    const teacherCount = teachers.length;

    let totalCompleted = 0, totalInProgress = 0, pctSum = 0;
    let fullyCompleted = 0, notStarted = 0, pctMismatch = 0;
    const pcts: number[] = [];
    const risk: TeacherRisk[] = [];

    for (const t of teachers) {
      totalCompleted += t.tamamlanan;
      totalInProgress += t.devamEden;
      pctSum += t.yuzde;
      pcts.push(t.yuzde);
      if (t.yuzde >= 100) fullyCompleted++;
      if (t.tamamlanan === 0) notStarted++;

      // Platformun yüzdesi, adetlerden hesaplanana uyuyor mu?
      const kayit = t.tamamlanan + t.devamEden;
      if (kayit > 0 && Math.abs((t.tamamlanan / kayit) * 100 - t.yuzde) > 1) pctMismatch++;

      if (t.yuzde < 50) {
        risk.push({
          ad: t.ad, sube: t.sube,
          yuzde: Math.round(t.yuzde),
          tamamlanan: t.tamamlanan, devamEden: t.devamEden,
        });
      }
    }

    const enrollments = totalCompleted + totalInProgress;

    // Şube kırılımı
    const subeMap = new Map<string, { n: number; sum: number; bitiren: number; kurs: number }>();
    for (const t of teachers) {
      const sube = t.sube || "—";
      const e = subeMap.get(sube) ?? { n: 0, sum: 0, bitiren: 0, kurs: 0 };
      e.n++; e.sum += t.yuzde; e.kurs += t.tamamlanan;
      if (t.yuzde >= 100) e.bitiren++;
      subeMap.set(sube, e);
    }
    const subeler: TeacherSubeStat[] = [...subeMap.entries()]
      .map(([sube, v]) => ({
        sube, ogretmen: v.n,
        ort: Math.round(v.sum / v.n),
        bitiren: v.bitiren,
        tamamlananKurs: v.kurs,
      }))
      .sort((a, b) => b.ort - a.ort);

    out.push({
      kurum,
      teacher_count: teacherCount,
      stats: {
        format: "ogretmen",
        teacherCount,
        totalCompleted,
        totalInProgress,
        enrollments,
        avgCompletion: teacherCount ? Math.round(pctSum / teacherCount) : 0,
        medianCompletion: median(pcts.map((p) => Math.round(p))),
        weightedCompletion: enrollments ? Math.round((totalCompleted / enrollments) * 100) : 0,
        fullyCompleted,
        notStarted,
        avgCoursesPerTeacher: teacherCount ? Math.round((enrollments / teacherCount) * 10) / 10 : 0,
        subeler,
        pctBuckets: PCT_BUCKETS.map(([aralik, fn]) => ({ aralik, sayi: pcts.filter(fn).length })),
        countBuckets: COUNT_BUCKETS.map(([aralik, fn]) => ({
          aralik, sayi: teachers.filter((t) => fn(t.tamamlanan)).length,
        })),
        risk: risk.sort((a, b) => a.yuzde - b.yuzde).slice(0, 50),
        mergedDuplicates,
        pctMismatch,
      },
    });
  }

  return out.sort((a, b) => a.kurum.localeCompare(b.kurum, "tr"));
}
