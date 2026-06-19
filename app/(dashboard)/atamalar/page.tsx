import { createClient } from "@/lib/supabase/server";
import { AssignmentsClient } from "@/components/assignments/assignments-client";

export default async function AtamalarPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [
    { data: rawAssignments },
    { data: schools },
    { data: trainings },
    { data: rawTrainers },
    { data: members },
    { data: member },
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select(`
        *,
        school:schools(id, name),
        training:trainings(id, title),
        trainer:trainers(id, contact:contacts(full_name)),
        assignee:team_members!assignments_assigned_to_fkey(id, full_name)
      `)
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase.from("schools").select("id, name").order("name"),
    supabase.from("trainings").select("id, title").eq("status", "aktif").order("title"),
    supabase.from("trainers").select("id, contact:contacts(full_name)").eq("status", "aktif"),
    supabase.from("team_members").select("id, full_name").order("full_name"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const canWrite = (member as any)?.role !== "viewer";

  const assignments = (rawAssignments ?? []) as unknown as Parameters<typeof AssignmentsClient>[0]["assignments"];
  const trainers    = (rawTrainers   ?? []) as unknown as Parameters<typeof AssignmentsClient>[0]["trainers"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Atamalar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Eğitim atamalarını ve durumlarını takip edin</p>
      </div>
      <AssignmentsClient
        assignments={assignments}
        schools={(schools ?? []) as { id: string; name: string }[]}
        trainings={(trainings ?? []) as { id: string; title: string }[]}
        trainers={trainers}
        members={(members ?? []) as { id: string; full_name: string }[]}
        canWrite={canWrite}
      />
    </div>
  );
}
