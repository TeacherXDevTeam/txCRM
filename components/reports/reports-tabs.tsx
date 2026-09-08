"use client";

import { useState } from "react";
import { GraduationCap, Users } from "lucide-react";
import { ReportUpload } from "./report-upload";
import { ReportDashboard } from "./report-dashboard";
import { TeacherReportUpload } from "./teacher-report-upload";
import { TeacherReportDashboard } from "./teacher-report-dashboard";
import { ClearUploadButton } from "./clear-upload-button";
import type { KurumStats } from "./report-client";
import type { TeacherKurumStats } from "./teacher-report-client";

export type ReportFormat = "ogretmen" | "kurs";

export interface UploadInfo {
  id: string;
  dosya_adi: string | null;
  uploaded_at: string;
  satir_sayisi: number;
}

interface Props {
  currentUserId: string;
  expectedByKurum: Record<string, number>;
  teacher: { upload: UploadInfo | null; kurumStats: { kurum: string; teacher_count: number; stats: TeacherKurumStats }[] };
  course: { upload: UploadInfo | null; kurumStats: { kurum: string; teacher_count: number; stats: KurumStats }[] };
}

const TABS: { key: ReportFormat; label: string; hint: string; icon: typeof Users }[] = [
  { key: "ogretmen", label: "Öğretmen Özeti", hint: "Adı Soyadı · Tamamlanan · Devam Eden · Tamamlama %", icon: Users },
  { key: "kurs", label: "Kurs Bazlı", hint: "Ad · Soyad · Kurs · İlerleme Yüzdesi · Sertifika Tarihi", icon: GraduationCap },
];

export function ReportsTabs({ currentUserId, expectedByKurum, teacher, course }: Props) {
  // Hangi sekmede daha yeni yükleme varsa onunla aç
  const [tab, setTab] = useState<ReportFormat>(() => {
    const t = teacher.upload?.uploaded_at;
    const c = course.upload?.uploaded_at;
    if (t && c) return t >= c ? "ogretmen" : "kurs";
    if (c && !t) return "kurs";
    return "ogretmen";
  });

  const active = tab === "ogretmen" ? teacher : course;

  return (
    <div className="space-y-5">
      {/* Sekme çubuğu — çıktıda gizli */}
      <div className="flex items-end justify-between gap-4 border-b border-gray-200 print:hidden">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const count = t.key === "ogretmen" ? teacher.kurumStats.length : course.kurumStats.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                title={t.hint}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {active.upload && (
          <div className="pb-2">
            <ClearUploadButton
              format={tab}
              rowCount={active.upload.satir_sayisi}
              label={tab === "ogretmen" ? "öğretmen" : "kurs kaydı"}
            />
          </div>
        )}
      </div>

      {tab === "ogretmen" ? (
        <>
          <TeacherReportUpload currentUserId={currentUserId} />
          {teacher.kurumStats.length === 0 ? (
            <EmptyState text="Henüz öğretmen özeti raporu yüklenmedi. Yukarıdan bir Excel dosyası seçin." />
          ) : (
            <TeacherReportDashboard
              kurumStats={teacher.kurumStats}
              expectedByKurum={expectedByKurum}
              uploadInfo={teacher.upload}
            />
          )}
        </>
      ) : (
        <>
          <ReportUpload currentUserId={currentUserId} />
          {course.kurumStats.length === 0 ? (
            <EmptyState text="Henüz kurs bazlı rapor yüklenmedi. Yukarıdan bir Excel dosyası seçin." />
          ) : (
            <ReportDashboard
              kurumStats={course.kurumStats}
              expectedByKurum={expectedByKurum}
              uploadInfo={course.upload}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed py-12 text-center text-sm text-gray-400 print:hidden">
      {text}
    </div>
  );
}
