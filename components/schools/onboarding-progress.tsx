import { CheckCircle2, Circle } from "lucide-react";

const MILESTONES = [
  { key: "sozlesme_imzalandi",        label: "Sözleşme İmzalandı"       },
  { key: "koordinator_girildi",        label: "Koordinatör Girildi"       },
  { key: "egitim_paketi_belirlendi",   label: "Eğitim Paketi Belirlendi"  },
  { key: "acilis_toplantisi_yapildi",  label: "Açılış Toplantısı Yapıldı" },
  { key: "certifiX_hesabi_olusturuldu", label: "CertifiX Hesabı Oluşturuldu" },
];

interface OnboardingProgressProps {
  /** `onboarding_milestones` tablosundaki kayıtlar — elle işaretlenmiş adımlar */
  completedKeys: string[];
  /**
   * Verinin kendisinden ÇIKARILAN adımlar. Sözleşme varsa sözleşme
   * imzalanmıştır, atama varsa eğitim paketi belirlenmiştir — bunu ayrıca
   * elle işaretletmek gereksiz iş ve unutulduğunda pano yanlış görünüyor.
   *
   * Elle işaretlenmiş bir adım, kanıt sonradan kaybolsa bile işaretli kalır:
   * insanın verdiği bilgi türetmeden güçlüdür.
   */
  otomatikKeys?: string[];
}

export function OnboardingProgress({ completedKeys, otomatikKeys = [] }: OnboardingProgressProps) {
  const tamamlanan = new Set([...completedKeys, ...otomatikKeys]);
  const completed = MILESTONES.filter((m) => tamamlanan.has(m.key)).length;
  const total = MILESTONES.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{completed}/{total} adım tamamlandı</span>
        <span className="font-semibold text-blue-600">%{pct}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2 mt-3">
        {MILESTONES.map((m) => {
          const done = tamamlanan.has(m.key);
          // Elle işaretlenmemiş ama veriden çıkarılmış olanlar belirtilir ki
          // tikin nereden geldiği belli olsun.
          const otomatik = done && !completedKeys.includes(m.key);
          return (
            <li key={m.key} className="flex items-center gap-2.5 text-sm">
              {done
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
              <span className={done ? "text-gray-700" : "text-gray-400"}>{m.label}</span>
              {otomatik && (
                <span className="text-[11px] text-gray-400" title="Bu adım kayıtlardan çıkarıldı">
                  otomatik
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
