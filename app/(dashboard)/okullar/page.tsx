import { createClient } from "@/lib/supabase/server";
import { SchoolsClient } from "@/components/schools/schools-client";
import type { Database } from "@/types/database";

export const metadata = { title: "Okullar — TeacherX CRM" };

export default async function OkullarPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rawSchools }, { data: member }] = await Promise.all([
    supabase.from("schools").select("*").order("name", { ascending: true }),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").single(),
  ]);

  const schools = (rawSchools ?? []) as unknown as Database["public"]["Tables"]["schools"]["Row"][];
  const canWrite = (member as any)?.role !== "viewer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Okullar</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm okul ortaklıkları ve ilişkiler</p>
      </div>
      <SchoolsClient schools={schools} canWrite={canWrite} />
    </div>
  );
}
