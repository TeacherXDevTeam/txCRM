import { createClient } from "@/lib/supabase/server";
import { LeadsBoard } from "@/components/leads/leads-board";
import type { LeadCardData } from "@/components/leads/lead-card";

export const metadata = { title: "Leadler — TeacherX CRM" };

export default async function LeadlerPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rawLeads }, { data: memberRaw }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, stage, source, estimated_value, next_action_date, notes, contact:contacts(id, full_name, organization), assignee:team_members!leads_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").single(),
  ]);

  const leads = (rawLeads ?? []) as unknown as LeadCardData[];
  const canWrite = (memberRaw as any)?.role !== "viewer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leadler</h1>
        <p className="text-sm text-gray-500 mt-1">Satış pipeline'ı ve lead takibi</p>
      </div>
      <LeadsBoard leads={leads} canWrite={canWrite} />
    </div>
  );
}
