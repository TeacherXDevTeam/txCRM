import Link from "next/link";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SchoolsClient } from "@/components/schools/schools-client";
import { SchoolCompleteness, type IncompleteSchool } from "@/components/schools/school-completeness";
import type { Database } from "@/types/database";

export const metadata = { title: "Okullar — TeacherX CRM" };

export default async function OkullarPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // expected_teacher_count generated types'ta yok → tipsiz erişim
  const sb = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: rawSchools }, { data: member }, { data: coordRows }, { data: contractRows }] = await Promise.all([
    supabase.from("schools").select("*").order("name", { ascending: true }),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").single(),
    supabase.from("coordinators").select("school_id"),
    sb.from("contracts").select("school_id, expected_teacher_count"),
  ]);

  const schools = (rawSchools ?? []) as unknown as Database["public"]["Tables"]["schools"]["Row"][];
  const canWrite = (member as any)?.role !== "viewer"; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Profil tamamlama hesabı
  const coordSet = new Set((coordRows ?? []).map((c: { school_id: string }) => c.school_id));
  const contractSet = new Set<string>();
  const expectedSet = new Set<string>();
  for (const c of (contractRows ?? []) as { school_id: string; expected_teacher_count: number | null }[]) {
    contractSet.add(c.school_id);
    if (c.expected_teacher_count != null) expectedSet.add(c.school_id);
  }

  const incomplete: IncompleteSchool[] = [];
  const missingCounts: Record<string, number> = { "Konum": 0, "Koordinatör": 0, "Sözleşme": 0, "Beklenen öğretmen": 0 };
  for (const s of schools) {
    const missing: string[] = [];
    if (!s.district || !s.city || s.city === "Belirtilmedi") missing.push("Konum");
    if (!coordSet.has(s.id)) missing.push("Koordinatör");
    if (!contractSet.has(s.id)) missing.push("Sözleşme");
    if (!expectedSet.has(s.id)) missing.push("Beklenen öğretmen");
    if (missing.length > 0) {
      incomplete.push({ id: s.id, name: s.name, missing });
      missing.forEach((m) => (missingCounts[m] += 1));
    }
  }

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
      <SchoolCompleteness total={schools.length} incomplete={incomplete} missingCounts={missingCounts} />

      <SchoolsClient schools={schools} canWrite={canWrite} />
    </div>
  );
}
