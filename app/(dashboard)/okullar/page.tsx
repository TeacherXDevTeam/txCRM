import Link from "next/link";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SchoolsClient } from "@/components/schools/schools-client";
import { SchoolCompleteness } from "@/components/schools/school-completeness";
import { profilEksikleri } from "@/components/schools/profil-eksikleri";

export const metadata = { title: "Okullar — TeacherX CRM" };

export default async function OkullarPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const [schoolsRes, { data: member }, coordRes, contractRes] = await Promise.all([
    supabase.from("schools").select("*").order("name", { ascending: true }),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").single(),
    supabase.from("coordinators").select("school_id"),
    supabase.from("contracts").select("school_id"),
  ]);

  const schools = schoolsRes.data ?? [];
  const canWrite = member?.role !== "viewer";

  /*
   * Sorgu hatasını YUTMA. Koordinatör ya da sözleşme sorgusu hata verirse
   * (RLS, şema değişikliği) boş dizi dönüyordu ve ekran "hepsinde eksik"
   * diyordu — veri yokmuş gibi. Sessiz yanlış yerine görünür uyarı.
   */
  const sorguHatasi = [
    coordRes.error && `koordinatörler: ${coordRes.error.message}`,
    contractRes.error && `sözleşmeler: ${contractRes.error.message}`,
  ].filter(Boolean).join(" · ") || null;

  const ozet = profilEksikleri(
    schools,
    new Set((coordRes.data ?? []).map((c: { school_id: string }) => c.school_id)),
    new Set((contractRes.data ?? []).map((c: { school_id: string }) => c.school_id)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Okullar</h1>
          <p className="text-sm text-gray-500 mt-1">Tüm okul ortaklıkları ve ilişkiler</p>
        </div>
        <Link
          href="/okullar/calistigimiz"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Handshake className="h-4 w-4" /> Çalıştığımız Okullar
        </Link>
      </div>
      <SchoolCompleteness total={ozet.toplam} incomplete={ozet.eksikler} missingCounts={ozet.sayilar}
          kapsamDisi={ozet.kapsamDisi} hata={sorguHatasi} />

      <SchoolsClient schools={schools} canWrite={canWrite} />
    </div>
  );
}
