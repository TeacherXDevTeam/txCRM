import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawMember } = await supabase
    .from("team_members")
    .select("*")
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .eq("id", user!.id)
    .single();

  if (!rawMember) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const member = rawMember as {
    id: string;
    full_name: string;
    email: string;
    role: "admin" | "member" | "viewer";
    department: string | null;
    avatar_url: string | null;
  };

  return (
    // print: yazdırırken h-screen/overflow kabuğu içeriği tek sayfaya kırpıyor → açılır
    <div className="flex h-screen bg-gray-50 print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden">
        <Sidebar role={member.role} department={member.department} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Header user={member} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
