import { createClient } from "@/lib/supabase/server";
import { TrainingsClient } from "@/components/trainings/trainings-client";

export default async function EgitimlerPage() {
  const supabase = await createClient();

  const userId = (await supabase.auth.getUser()).data.user?.id ?? "";
  const [
    { data: trainings },
    { data: rawPackages },
    rawPTResult,
    { data: member },
  ] = await Promise.all([
    supabase.from("trainings").select("*").order("title"),
    supabase.from("packages").select("*").order("name"),
    supabase.from("package_trainings").select("package_id, training_id, trainings(id, title)"),
    supabase.from("team_members").select("role").eq("id", userId).single(),
  ]);

  const rawPT = (rawPTResult.data ?? []) as unknown as { package_id: string; training_id: string; trainings: { id: string; title: string } | null }[];

  const canWrite = (member as any)?.role !== "viewer";

  // Attach training list and training_ids to each package
  const ptMap: Record<string, { id: string; title: string }[]> = {};
  for (const row of rawPT) {
    if (!ptMap[row.package_id]) ptMap[row.package_id] = [];
    if (row.trainings) ptMap[row.package_id].push({ id: row.trainings.id, title: row.trainings.title });
  }

  const packages = (rawPackages ?? []).map((pkg) => ({
    ...pkg,
    training_ids: (ptMap[pkg.id] ?? []).map((t) => t.id),
    trainings:    ptMap[pkg.id] ?? [],
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eğitimler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eğitim kataloğu ve paket yönetimi</p>
        </div>
      </div>
      <TrainingsClient
        trainings={(trainings ?? []) as any}
        packages={packages as any}
        canWrite={canWrite}
      />
    </div>
  );
}
