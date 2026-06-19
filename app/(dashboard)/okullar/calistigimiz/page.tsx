import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  WorkingSchoolsClient,
  type WorkingSchool,
  type VisitMeeting,
} from "@/components/schools/working-schools-client";

export const metadata = { title: "Çalıştığımız Okullar — TeacherX CRM" };
export const dynamic = "force-dynamic";

export default async function CalistigimizOkullarPage() {
  const supabase = createClient();

  // Çalıştığımız okullar = aktif sözleşmesi olan okullar
  const [{ data: contractRows }, { data: meetingRows }] = await Promise.all([
    supabase
      .from("contracts")
      .select("school_id, school:schools(id, name, city, district)")
      .eq("status", "aktif"),
    supabase
      .from("meetings")
      .select("id, title, meeting_date, related_entity_id, meeting_contacts(contact:contacts(full_name))")
      .eq("related_entity_type", "school")
      .order("meeting_date", { ascending: false }),
  ]);

  // okulları tekilleştir
  const map = new Map<string, WorkingSchool>();
  for (const row of (contractRows ?? []) as unknown as { school: WorkingSchool | null }[]) {
    if (row.school && !map.has(row.school.id)) map.set(row.school.id, row.school);
  }
  const schools = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const meetings: VisitMeeting[] = ((meetingRows ?? []) as unknown as {
    id: string; title: string; meeting_date: string; related_entity_id: string | null;
    meeting_contacts: { contact: { full_name: string } | null }[];
  }[]).map((m) => ({
    id: m.id,
    title: m.title,
    meeting_date: m.meeting_date,
    related_entity_id: m.related_entity_id,
    attendees: (m.meeting_contacts ?? []).map((mc) => mc.contact?.full_name).filter(Boolean) as string[],
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/okullar"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Okullar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Çalıştığımız Okullar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aktif sözleşmeli okullar ve onlara bağlı okul ziyareti toplantıları.
        </p>
      </div>
      <WorkingSchoolsClient schools={schools} meetings={meetings} />
    </div>
  );
}
