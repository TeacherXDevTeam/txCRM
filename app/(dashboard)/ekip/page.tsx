import { createClient } from "@/lib/supabase/server";
import { TeamClient } from "@/components/team/team-client";

export default async function EkipPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [
    { data: members },
    { data: self },
  ] = await Promise.all([
    supabase.from("team_members").select("*").order("full_name"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const isAdmin = (self as any)?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ekip</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ekip üyeleri, roller ve departmanlar</p>
      </div>
      <TeamClient
        members={(members ?? []) as any}
        currentId={userId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
