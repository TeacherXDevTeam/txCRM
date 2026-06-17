import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  School,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckSquare,
  FileText,
} from "lucide-react";

async function getDashboardMetrics() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    { count: activeSchools },
    { count: completedThisMonth },
    { data: pipelineLeads },
    { data: allLeads },
    { count: openTodos },
    { count: overdueAssignments },
    { count: expiringContracts },
  ] = await Promise.all([
    supabase.from("schools").select("*", { count: "exact", head: true }).eq("status", "aktif"),
    supabase.from("assignments").select("*", { count: "exact", head: true })
      .eq("status", "tamamlandi")
      .gte("completed_date", startOfMonth),
    supabase.from("leads").select("estimated_value")
      .not("stage", "in", '("kapandi_kazanildi","kapandi_kaybedildi")') as unknown as { data: { estimated_value: number | null }[] | null },
    supabase.from("leads").select("stage")
      .in("stage", ["kapandi_kazanildi", "kapandi_kaybedildi"]) as unknown as { data: { stage: string }[] | null },
    supabase.from("todo_items").select("*", { count: "exact", head: true })
      .eq("status", "acik")
      .eq("assigned_to", user?.id ?? ""),
    supabase.from("assignments").select("*", { count: "exact", head: true })
      .eq("status", "planlanmis")
      .lt("scheduled_date", now.toISOString().split("T")[0]),
    supabase.from("contracts").select("*", { count: "exact", head: true })
      .eq("status", "aktif")
      .lte("end_date", thirtyDaysLater),
  ]);

  const pipelineValue = (pipelineLeads ?? []).reduce(
    (sum, l) => sum + (l.estimated_value ?? 0),
    0
  );

  const won = (allLeads ?? []).filter((l) => l.stage === "kapandi_kazanildi").length;
  const total = (allLeads ?? []).filter((l) =>
    ["kapandi_kazanildi", "kapandi_kaybedildi"].includes(l.stage)
  ).length;
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return {
    activeSchools: activeSchools ?? 0,
    completedThisMonth: completedThisMonth ?? 0,
    pipelineValue,
    conversionRate,
    openTodos: openTodos ?? 0,
    overdueAssignments: overdueAssignments ?? 0,
    expiringContracts: expiringContracts ?? 0,
  };
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const cards = [
    {
      title: "Aktif Okul",
      value: metrics.activeSchools,
      icon: School,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Bu Ay Tamamlanan Eğitim",
      value: metrics.completedThisMonth,
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Pipeline Değeri",
      value: formatCurrency(metrics.pipelineValue),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Lead Dönüşüm Oranı",
      value: `%${metrics.conversionRate}`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Açık Görevlerim",
      value: metrics.openTodos,
      icon: CheckSquare,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Geciken Atama",
      value: metrics.overdueAssignments,
      icon: AlertTriangle,
      color: metrics.overdueAssignments > 0 ? "text-red-600" : "text-gray-400",
      bg: metrics.overdueAssignments > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      title: "Süresi Dolacak Sözleşme",
      value: metrics.expiringContracts,
      icon: FileText,
      color: metrics.expiringContracts > 0 ? "text-yellow-600" : "text-gray-400",
      bg: metrics.expiringContracts > 0 ? "bg-yellow-50" : "bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">TeacherX CRM genel durumu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg border border-gray-200 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <div className={`p-2 rounded-md ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
