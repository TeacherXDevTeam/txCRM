"use client";

import { useState } from "react";
import { GraduationCap, Users, LayoutDashboard } from "lucide-react";
import { ReportUpload } from "./report-upload";
import { ReportDashboard } from "./report-dashboard";
import { TeacherReportUpload } from "./teacher-report-upload";
import { TeacherReportDashboard } from "./teacher-report-dashboard";
import { ClearUploadButton } from "./clear-upload-button";
import { KesitPanosu } from "./kesit-panosu";
import type { KurumStats } from "./report-client";
import type { TeacherKurumStats, TeacherRow } from "./teacher-report-client";

export type ReportFormat = "kesit" | "ogretmen" | "kurs";

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
  { key: "kesit", label: "Kurum Takip", hint: "Tüm kurumlar tek dosyada · karşılaştırma ve kurum raporu", icon: LayoutDashboard },
  { key: "ogretmen", label: "Öğretmen Özeti", hint: "Adı Soyadı · Tamamlanan · Devam Eden · Tamamlama %", icon: Users },
  { key: "kurs", label: "Kurs Bazlı", hint: "Ad · Soyad · Kurs · İlerleme Yüzdesi · Sertifika Tarihi", icon: GraduationCap },
];

export function ReportsTabs({ currentUserId, expectedByKurum, teacher, course }: Props) {
  // Bu oturumda yüklenen ham öğretmen satırları — yalnızca "Öğretmen Listesi"
  // çıktısı için bellekte tutulur, hiçbir zaman kaydedilmez.
  const [oturumSatirlari, setOturumSatirlari] = useState<TeacherRow[]>([]);
  // Hangi sekmede daha yeni yükleme varsa onunla aç
  const [tab, setTab] = useState<ReportFormat>("kesit");

  const active = tab === "ogretmen" ? teacher : course;

  return (
    <div className="space-y-5">
      {/* Sekme çubuğu — çıktıda gizli */}
      <div className="ic-arac flex items-end justify-between gap-4 border-b border-tx-cizgi">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const count = t.key === "kesit" ? 0
              : t.key === "ogretmen" ? teacher.kurumStats.length : course.kurumStats.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                title={t.hint}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 font-baslik text-sm font-medium transition-colors ${
                  isActive
                    ? "border-tx-kirmizi text-tx-metin"
                    : "border-transparent text-tx-gri hover:border-tx-cizgi hover:text-tx-metin"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${isActive ? "bg-tx-kirmizi text-white" : "bg-tx-dolgu text-tx-gri"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {tab !== "kesit" && active.upload && (
          <div className="pb-2">
            <ClearUploadButton
              format={tab}
              rowCount={active.upload.satir_sayisi}
              label={tab === "ogretmen" ? "öğretmen" : "kurs kaydı"}
            />
          </div>
        )}
      </div>

      {/*
        Kurum Takip her zaman MONTE KALIR, yalnızca gizlenir.
        Koşullu render edilirse sekme değiştirildiğinde React bileşeni söküyor
        ve yüklenen kesit kayboluyor — kesit henüz veritabanına yazılmadığı için
        (Adım 3) tek kopyası bu bileşenin state'inde duruyor.
      */}
      <div className={tab === "kesit" ? "" : "hidden"}>
        <KesitPanosu />
      </div>

      {tab === "kesit" ? null : tab === "ogretmen" ? (
        <>
          <TeacherReportUpload currentUserId={currentUserId} onYuklendi={setOturumSatirlari} />
          {teacher.kurumStats.length === 0 ? (
            <EmptyState text="Henüz öğretmen özeti raporu yüklenmedi. Yukarıdan bir Excel dosyası seçin." />
          ) : (
            <TeacherReportDashboard
              kurumStats={teacher.kurumStats}
              expectedByKurum={expectedByKurum}
              uploadInfo={teacher.upload}
              oturumSatirlari={oturumSatirlari}
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
    <div className="ic-arac rounded-lg border border-dashed border-tx-cizgi bg-white py-12 text-center text-sm text-tx-gri">
      {text}
    </div>
  );
}
