import { createClient } from "@/lib/supabase/server";
import { TrainersClient } from "@/components/trainers/trainers-client";

export default async function EgitmenlerPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const today = new Date().toISOString().split("T")[0];

  const [
    rawTrainersResult,
    { data: contacts },
    { data: member },
  ] = await Promise.all([
    supabase
      .from("trainers")
      .select(`
        *,
        contact:contacts(id, full_name, email, phone, title, organization),
        assignments(
          id, scheduled_date, status,
          school:schools(name),
          training:trainings(title)
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, full_name, email").order("full_name"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const canWrite = (member as any)?.role !== "viewer";

  const trainers = ((rawTrainersResult.data ?? []) as any[]).map((t) => {
    const allAssignments = (t.assignments ?? []) as any[];
    return {
      ...t,
      total_assignments: allAssignments.length,
      upcoming_assignments: allAssignments
        .filter((a) => a.scheduled_date && a.scheduled_date >= today && a.status !== "iptal" && a.status !== "tamamlandi")
        .sort((a: any, b: any) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "")),
    };
  });

  // Contacts not already a trainer (for add form)
  const existingContactIds = new Set(trainers.map((t) => t.contact_id));
  const availableContacts = ((contacts ?? []) as any[]).filter((c) => !existingContactIds.has(c.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Eğitmenler</h1>
        <p className="text-sm text-gray-500 mt-0.5">Eğitmen profilleri, uzmanlık alanları ve atama geçmişi</p>
      </div>
      <TrainersClient
        trainers={trainers as any}
        contacts={availableContacts as any}
        canWrite={canWrite}
      />
    </div>
  );
}
