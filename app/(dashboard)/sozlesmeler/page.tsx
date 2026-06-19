import { createClient } from "@/lib/supabase/server";
import { ContractsClient } from "@/components/contracts/contracts-client";

export default async function SozlesmelerPage() {
  const supabase = await createClient();
  const userId   = (await supabase.auth.getUser()).data.user?.id ?? "";

  const [
    rawContractsResult,
    { data: schools },
    { data: packages },
    { data: trainings },
    { data: member },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(`
        *,
        school:schools(id, name),
        package:packages(id, name),
        orders(*, training:trainings(title))
      `)
      .order("created_at", { ascending: false }),
    supabase.from("schools").select("id, name").order("name"),
    supabase.from("packages").select("id, name").eq("status", "aktif").order("name"),
    supabase.from("trainings").select("id, title").eq("status", "aktif").order("title"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const role     = (member as any)?.role;
  const canWrite = role === "admin" || role === "operasyon";

  const contracts = (rawContractsResult.data ?? []) as unknown as Parameters<typeof ContractsClient>[0]["contracts"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sözleşmeler</h1>
        <p className="text-sm text-gray-500 mt-0.5">Okul sözleşmeleri, sipariş kalemleri ve ödeme durumları</p>
      </div>
      <ContractsClient
        contracts={contracts}
        schools={(schools ?? []) as { id: string; name: string }[]}
        packages={(packages ?? []) as { id: string; name: string }[]}
        trainings={(trainings ?? []) as { id: string; title: string }[]}
        currentUserId={userId}
        canWrite={canWrite}
      />
    </div>
  );
}
