import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts/contacts-client";

export const metadata = { title: "Kişiler — TeacherX CRM" };

export default async function KisilerPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: contacts }, { data: member }] = await Promise.all([
    supabase.from("contacts").select("*").order("full_name", { ascending: true }),
    supabase.from("team_members").select("role").eq("id", user?.id ?? "").single(),
  ]);

  const canWrite = (member as any)?.role !== "viewer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kişiler</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tüm okul koordinatörleri, eğitmenler ve partnerler
        </p>
      </div>
      <ContactsClient contacts={contacts ?? []} canWrite={canWrite} />
    </div>
  );
}
