import { createClient } from "@/lib/supabase/server";
import { ReportsTabs, type UploadInfo } from "@/components/reports/reports-tabs";
import type { KurumStats } from "@/components/reports/report-client";
import type { TeacherKurumStats } from "@/components/reports/teacher-report-client";

export const metadata = { title: "Raporlar — TeacherX CRM" };
export const dynamic = "force-dynamic";

const normKurum = (s: string) => (s ?? "").toLowerCase().trim();

export default async function RaporlarPage() {
  const supabase = createClient();
  // report_* tabloları generated types'ta yok → tipsiz erişim (Faz 2 İş 1'de düzelecek)
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

  // "format" kolonu canlıya henüz uygulanmadıysa sorgu hata verir → sessizce boş
  // görünmek yerine kullanıcıya çalıştırması gereken SQL'i söyleriz.
  let schemaError: string | null = null;

  // Her format için en son yükleme + kurum özetleri (ham satır asla çekilmez)
  async function loadLatest<T>(format: "ogretmen" | "kurs") {
    const bos = { upload: null, kurumStats: [] as { kurum: string; teacher_count: number; stats: T }[] };

    const { data: uploads, error: upErr } = await sb.from("report_uploads")
      .select("id, dosya_adi, uploaded_at, satir_sayisi")
      .eq("format", format)
      .order("uploaded_at", { ascending: false })
      .limit(1);
    if (upErr) { schemaError = upErr.message; return bos; }

    const upload = ((uploads ?? [])[0] as UploadInfo | undefined) ?? null;
    if (!upload) return bos;

    const { data: statRows } = await sb.from("report_kurum_stats")
      .select("kurum, teacher_count, stats")
      .eq("upload_id", upload.id)
      .order("kurum");
    return {
      upload,
      kurumStats: (statRows ?? []) as { kurum: string; teacher_count: number; stats: T }[],
    };
  }

  const [teacher, course] = await Promise.all([
    loadLatest<TeacherKurumStats>("ogretmen"),
    loadLatest<KurumStats>("kurs"),
  ]);

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
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platformdan aldığınız Excel&apos;i yükleyin; kurum bazında özet, grafikler ve sözleşme karşılaştırması otomatik çıkar.
          Dosya tarayıcınızda işlenir, sunucuya yalnızca sayısal özet gider.
        </p>
      </div>

      {schemaError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
          <p className="font-medium">Veritabanı güncellemesi bekliyor</p>
          <p className="mt-1 text-xs">
            Raporlar iki formata ayrıldı ama <code className="rounded bg-amber-100 px-1">report_uploads.format</code> kolonu
            canlıya henüz uygulanmadı, bu yüzden mevcut raporlar listelenemiyor. Supabase → SQL Editor&apos;de
            <code className="mx-1 rounded bg-amber-100 px-1">supabase/migrations/20260908000000_rapor_format_ayrimi.sql</code>
            dosyasını çalıştırın.
          </p>
          <p className="mt-1 text-xs text-amber-700">Sunucu mesajı: {schemaError}</p>
        </div>
      )}

      <ReportsTabs
        currentUserId={user?.id ?? ""}
        expectedByKurum={expectedByKurum}
        teacher={teacher}
        course={course}
      />
    </div>
  );
}
