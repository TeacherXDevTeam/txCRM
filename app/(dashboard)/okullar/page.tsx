import Link from "next/link";
import { Handshake } from "lucide-react";
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
      <SchoolsClient schools={schools} canWrite={canWrite} />
    </div>
  );
}
