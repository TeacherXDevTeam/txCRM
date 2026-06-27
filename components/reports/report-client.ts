"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createReportClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Excel'den parse edilen ham kurs kaydı
export interface CourseRow {
  ad: string;
  eposta: string;
  kurum: string;
  sube: string;
  kurs: string;
  ilerleme: number; // 0..1
  sertifika: string;
}

export interface SubeStat { sube: string; ogretmen: number; ort: number; tamRate: number }
export interface KursStat { kurs: string; atanan: number; tamamlayan: number; oran: number }
export interface BucketStat { aralik: string; sayi: number }
export interface RiskTeacher { ad: string; sube: string; yuzde: number }

export interface KurumStats {
  teacherCount: number;
  courseCount: number;
  enrollments: number;
  avgCompletion: number;       // 0..100 (öğretmen başına tamamlama ortalaması)
  fullyCompleted: number;      // tüm atanan kurslarını bitiren öğretmen
  certCount: number;
  totalCompleted: number;
  totalInProgress: number;
  totalNotStarted: number;
  subeler: SubeStat[];
  kurslar: KursStat[];
  buckets: BucketStat[];
  risk: RiskTeacher[];
}

const BUCKETS: [string, (n: number) => boolean][] = [
  ["0", (n) => n === 0],
  ["1-5", (n) => n >= 1 && n <= 5],
  ["6-10", (n) => n >= 6 && n <= 10],
  ["11-15", (n) => n >= 11 && n <= 15],
  ["16+", (n) => n >= 16],
];

// Tüm satırları kuruma göre özetle (yükleme anında tarayıcıda çalışır)
export function computeStatsByKurum(
  rows: CourseRow[]
): { kurum: string; teacher_count: number; stats: KurumStats }[] {
  const byKurum = new Map<string, CourseRow[]>();
  for (const r of rows) {
    const k = r.kurum || "—";
    if (!byKurum.has(k)) byKurum.set(k, []);
    byKurum.get(k)!.push(r);
  }

  const out: { kurum: string; teacher_count: number; stats: KurumStats }[] = [];

  for (const [kurum, krows] of byKurum) {
    // öğretmen (e-posta) bazında grupla
    const byTeacher = new Map<string, CourseRow[]>();
    for (const r of krows) {
      const key = r.eposta || r.ad;
      if (!byTeacher.has(key)) byTeacher.set(key, []);
      byTeacher.get(key)!.push(r);
    }

    let fullyCompleted = 0;
    let pctSum = 0;
    const completedCounts: number[] = [];
    const risk: RiskTeacher[] = [];

    for (const [, trows] of byTeacher) {
      const assigned = trows.length;
      const completed = trows.filter((r) => r.ilerleme >= 1).length;
      const pct = assigned ? (completed / assigned) * 100 : 0;
      pctSum += pct;
      completedCounts.push(completed);
      if (assigned > 0 && completed === assigned) fullyCompleted++;
      if (pct < 50) {
        const t = trows[0];
        risk.push({ ad: t.ad, sube: t.sube, yuzde: Math.round(pct) });
      }
    }

    const teacherCount = byTeacher.size;
    const totalCompleted = krows.filter((r) => r.ilerleme >= 1).length;
    const totalInProgress = krows.filter((r) => r.ilerleme > 0 && r.ilerleme < 1).length;
    const totalNotStarted = krows.filter((r) => r.ilerleme === 0).length;
    const certCount = krows.filter((r) => String(r.sertifika).trim() !== "").length;

    // şube kırılımı
    const subeMap = new Map<string, { n: number; sum: number; fully: number }>();
    for (const [, trows] of byTeacher) {
      const sube = trows[0].sube || "—";
      const assigned = trows.length;
      const completed = trows.filter((r) => r.ilerleme >= 1).length;
      const pct = assigned ? (completed / assigned) * 100 : 0;
      const e = subeMap.get(sube) ?? { n: 0, sum: 0, fully: 0 };
      e.n++; e.sum += pct; if (completed === assigned && assigned > 0) e.fully++;
      subeMap.set(sube, e);
    }
    const subeler: SubeStat[] = [...subeMap.entries()]
      .map(([sube, v]) => ({ sube, ogretmen: v.n, ort: Math.round(v.sum / v.n), tamRate: Math.round((v.fully / v.n) * 100) }))
      .sort((a, b) => b.ort - a.ort);

    // kurs kırılımı
    const kursMap = new Map<string, { atanan: number; tamamlayan: number }>();
    for (const r of krows) {
      const e = kursMap.get(r.kurs) ?? { atanan: 0, tamamlayan: 0 };
      e.atanan++; if (r.ilerleme >= 1) e.tamamlayan++;
      kursMap.set(r.kurs, e);
    }
    const kurslar: KursStat[] = [...kursMap.entries()]
      .map(([kurs, v]) => ({ kurs, atanan: v.atanan, tamamlayan: v.tamamlayan, oran: Math.round((v.tamamlayan / v.atanan) * 100) }))
      .sort((a, b) => a.oran - b.oran); // en düşük tamamlanan kurs üstte

    // bucket
    const buckets: BucketStat[] = BUCKETS.map(([aralik, fn]) => ({
      aralik, sayi: completedCounts.filter(fn).length,
    }));

    out.push({
      kurum,
      teacher_count: teacherCount,
      stats: {
        teacherCount,
        courseCount: kursMap.size,
        enrollments: krows.length,
        avgCompletion: teacherCount ? Math.round(pctSum / teacherCount) : 0,
        fullyCompleted,
        certCount,
        totalCompleted,
        totalInProgress,
        totalNotStarted,
        subeler,
        kurslar,
        buckets,
        risk: risk.sort((a, b) => a.yuzde - b.yuzde).slice(0, 20),
      },
    });
  }

  return out.sort((a, b) => a.kurum.localeCompare(b.kurum, "tr"));
}
