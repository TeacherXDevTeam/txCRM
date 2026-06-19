import { createClient } from "@/lib/supabase/server";
import { WGListClient } from "@/components/working-groups/wg-list-client";

export default async function CalismaGruplariPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [
    rawWGResult,
    { data: contacts },
    { data: member },
  ] = await Promise.all([
    supabase
      .from("working_groups")
      .select(`
        *,
        wg_members(*, contact:contacts(full_name, organization)),
        wg_phases(*),
        wg_sessions(*)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, full_name, organization").order("full_name"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const canWrite = (member as any)?.role !== "viewer";

  const wgs = ((rawWGResult.data ?? []) as any[]).map((g) => ({
    ...g,
    member_count:  (g.wg_members  ?? []).length,
    session_count: (g.wg_sessions ?? []).length,
    phases:        g.wg_phases  ?? [],
    members:       g.wg_members  ?? [],
    sessions:      g.wg_sessions ?? [],
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çalışma Grupları</h1>
        <p className="text-sm text-gray-500 mt-0.5">Faz takibi, üyeler ve oturum notları</p>
      </div>
      <WGListClient
        wgs={wgs as any}
        contacts={(contacts ?? []) as { id: string; full_name: string; organization: string | null }[]}
        canWrite={canWrite}
      />
    </div>
  );
}
