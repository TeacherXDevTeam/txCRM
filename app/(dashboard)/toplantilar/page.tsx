import { createClient } from "@/lib/supabase/server";
import { MeetingsClient } from "@/components/meetings/meetings-client";

export default async function ToplantilarPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [
    rawMeetingsResult,
    { data: contacts },
    { data: members },
    { data: member },
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select(`
        *,
        meeting_contacts(contact_id, contact:contacts(id, full_name, organization)),
        todo_items(*, assignee:team_members!todo_items_assigned_to_fkey(full_name))
      `)
      .order("meeting_date", { ascending: false }),
    supabase.from("contacts").select("id, full_name, organization").order("full_name"),
    supabase.from("team_members").select("id, full_name").order("full_name"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const canWrite = (member as any)?.role !== "viewer";

  // Shape raw meetings into typed structure
  const meetings = ((rawMeetingsResult.data ?? []) as any[]).map((m) => ({
    ...m,
    attendees:    (m.meeting_contacts ?? []).map((mc: any) => mc.contact).filter(Boolean),
    attendee_ids: (m.meeting_contacts ?? []).map((mc: any) => mc.contact_id),
    todos:        (m.todo_items ?? []),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Toplantılar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Toplantı notları, todo'lar ve etiketler</p>
      </div>
      <MeetingsClient
        meetings={meetings as any}
        contacts={(contacts ?? []) as { id: string; full_name: string; organization: string | null }[]}
        members={(members ?? []) as { id: string; full_name: string }[]}
        currentUserId={userId}
        canWrite={canWrite}
      />
    </div>
  );
}
