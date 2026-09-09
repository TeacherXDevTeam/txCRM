import { createClient } from "@/lib/supabase/server";
import { KesitPanosu } from "@/components/reports/kesit-panosu";

export const metadata = { title: "Raporlar — TeacherX CRM" };
export const dynamic = "force-dynamic";

export default async function RaporlarPage() {
  const supabase = createClient();

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

  return (
    <div className="space-y-6">
      <div className="ic-arac">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-tx-kirmizi">TeacherX</p>
        <h1 className="font-baslik text-2xl font-semibold text-tx-metin">Raporlar</h1>
        <p className="mt-0.5 font-mono text-[11px] text-tx-gri">
          sürüm {process.env.NEXT_PUBLIC_BUILD_SHA ?? "local"}
        </p>
        <p className="mt-1 text-sm text-tx-gri">
          Platformdan aldığınız tamamlama raporunu yükleyin; kurum karşılaştırması, şube ve eğitim
          analizi ile kuruma gönderilebilir rapor otomatik çıkar. Dosya tarayıcınızda işlenir;
          ad, e-posta ve kişi bazlı bilgi hiçbir yere kaydedilmez.
        </p>
      </div>

      <KesitPanosu />
    </div>
  );
}
