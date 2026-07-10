import { createClient } from "@/lib/supabase/server";
import { ReportUpload } from "@/components/reports/report-upload";
import { ReportDashboard } from "@/components/reports/report-dashboard";
import { ClearUploadButton } from "@/components/reports/clear-upload-button";
import type { KurumStats } from "@/components/reports/report-client";

export const metadata = { title: "Raporlar — TeacherX CRM" };
export const dynamic = "force-dynamic";

const normKurum = (s: string) => (s ?? "").toLowerCase().trim();

export default async function RaporlarPage() {
  const supabase = createClient();
  // report tabloları generated types'ta yok → tipsiz erişim
  const sb = supabase as unknown as {
    from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberRaw } = await supabase
    .from("team_members").select("role, department").eq("id", user?.id ?? "").single();
  const member = memberRaw as { role: string; department: string | null } | null;
  const allowed = member?.role === "admin" || member?.department === "operasyon";

  if (!allowed) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-gray-400">
        Bu sayfa yalnızca admin ve operasyon ekibi içindir.
      </div>
    );
  }

  // En son yükleme + satırları
  const { data: uploads } = await sb.from("report_uploads")
    .select("id, dosya_adi, uploaded_at, satir_sayisi")
    .order("uploaded_at", { ascending: false }).limit(1);
  const latest = (uploads ?? [])[0] as { id: string; dosya_adi: string | null; uploaded_at: string; satir_sayisi: number } | undefined;

  // Kurum özetleri (önceden hesaplanmış, küçük) — ham satır çekilmez
  let kurumStats: { kurum: string; teacher_count: number; stats: KurumStats }[] = [];
  if (latest) {
    const { data: statRows } = await sb.from("report_kurum_stats")
      .select("kurum, teacher_count, stats")
      .eq("upload_id", latest.id)
      .order("kurum");
    kurumStats = (statRows ?? []) as { kurum: string; teacher_count: number; stats: KurumStats }[];
  }

  // Sözleşmedeki "olması gereken öğretmen sayısı" → kurum (okul) adına göre
  const { data: contractData } = await sb.from("contracts")
    .select("expected_teacher_count, school:schools(name)")
    .not("expected_teacher_count", "is", null);
  const expectedByKurum: Record<string, number> = {};
  for (const c of (contractData ?? []) as { expected_teacher_count: number; school: { name: string } | null }[]) {
    const name = c.school?.name;
    if (!name) continue;
    expectedByKurum[normKurum(name)] = (expectedByKurum[normKurum(name)] ?? 0) + (c.expected_teacher_count ?? 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Eğitim tamamlama raporunu yükle; kurum bazında otomatik özet, grafikler ve sözleşme karşılaştırması.
          </p>
        </div>
        {latest && (
          <ClearUploadButton uploadId={latest.id} rowCount={latest.satir_sayisi} />
        )}
      </div>

      <ReportUpload currentUserId={user?.id ?? ""} />

      {kurumStats.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-gray-400">
          Henüz yüklenmiş rapor yok. Yukarıdan bir Excel dosyası yükle.
        </div>
      ) : (
        <ReportDashboard kurumStats={kurumStats} expectedByKurum={expectedByKurum} uploadInfo={latest ?? null} />
      )}
    </div>
  );
}
