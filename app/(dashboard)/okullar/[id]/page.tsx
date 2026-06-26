import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Building2, Users, BookOpen, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SchoolStatusBadge } from "@/components/schools/school-status-badge";
import { OnboardingProgress } from "@/components/schools/onboarding-progress";
import { SchoolDetailActions } from "@/components/schools/school-detail-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Database } from "@/types/database";

type SchoolRow = Database["public"]["Tables"]["schools"]["Row"];
type CoordRow = { id: string; is_primary: boolean; contact: { id: string; full_name: string; email: string | null; phone: string | null; title: string | null } };
type AssignmentRow = { id: string; status: string; scheduled_date: string | null; completed_date: string | null; training: { title: string } | null; trainer: { contact: { full_name: string } } | null };
type ContractRow = { id: string; start_date: string; end_date: string; contract_value: number; status: string; payment_status: string; package: { name: string } | null };
type ActivityRow = { id: string; activity_type: string; summary: string; activity_date: string };

const ASSIGNMENT_STATUS: Record<string, { label: string; color: string }> = {
  planlanmis:    { label: "Planlandı",    color: "bg-blue-50 text-blue-700"   },
  devam_ediyor:  { label: "Devam Ediyor", color: "bg-yellow-50 text-yellow-700" },
  tamamlandi:    { label: "Tamamlandı",   color: "bg-green-50 text-green-700"  },
  iptal:         { label: "İptal",        color: "bg-red-50 text-red-700"      },
};

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  aktif:        { label: "Aktif",        color: "bg-green-50 text-green-700"  },
  suresi_doldu: { label: "Süresi Doldu", color: "bg-gray-50 text-gray-500"    },
  iptal:        { label: "İptal",        color: "bg-red-50 text-red-700"      },
};

const ACTIVITY_ICONS: Record<string, string> = {
  telefon: "📞", eposta: "✉️", toplanti: "🤝", ziyaret: "🏫", not: "📝",
};

export default async function OkulDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: rawSchool } = await supabase
    .from("schools")
    .select("*")
    .eq("id", params.id)
    .single();

  const school = rawSchool as unknown as SchoolRow | null;
  if (!school) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberRaw } = await supabase.from("team_members").select("role").eq("id", user?.id ?? "").single();
  const role = (memberRaw as any)?.role as string | undefined;
  const canWrite = role !== "viewer";

  const [
    { data: rawCoords },
    { data: rawAssignments },
    { data: rawContracts },
    { data: rawMilestones },
    { data: rawActivities },
    { data: rawMeetings },
  ] = await Promise.all([
    supabase.from("coordinators")
      .select("id, is_primary, contact:contacts(id, full_name, email, phone, title)")
      .eq("school_id", params.id),
    supabase.from("assignments")
      .select("id, status, scheduled_date, completed_date, training:trainings(title), trainer:trainers(contact:contacts(full_name))")
      .eq("school_id", params.id)
      .order("scheduled_date", { ascending: false }),
    supabase.from("contracts")
      .select("id, start_date, end_date, contract_value, status, payment_status, package:packages(name)")
      .eq("school_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("onboarding_milestones")
      .select("milestone_key")
      .eq("school_id", params.id),
    supabase.from("activities")
      .select("id, activity_type, summary, activity_date")
      .eq("school_id", params.id)
      .order("activity_date", { ascending: false })
      .limit(5),
    supabase.from("meetings")
      .select("id, title, meeting_date, meeting_type, meeting_contacts(contact:contacts(full_name))")
      .eq("related_entity_type", "school")
      .eq("related_entity_id", params.id)
      .order("meeting_date", { ascending: false }),
  ]);

  const coords      = (rawCoords      ?? []) as unknown as CoordRow[];
  const assignments = (rawAssignments ?? []) as unknown as AssignmentRow[];
  const contracts   = (rawContracts   ?? []) as unknown as ContractRow[];
  const milestones  = (rawMilestones  ?? []) as unknown as { milestone_key: string }[];
  const activities  = (rawActivities  ?? []) as unknown as ActivityRow[];
  const meetings    = ((rawMeetings ?? []) as unknown as {
    id: string; title: string; meeting_date: string; meeting_type: string;
    meeting_contacts: { contact: { full_name: string } | null }[];
  }[]).map((m) => ({
    id: m.id, title: m.title, meeting_date: m.meeting_date,
    attendees: (m.meeting_contacts ?? []).map((mc) => mc.contact?.full_name).filter(Boolean) as string[],
  }));

  const completedMilestoneKeys = milestones.map((m) => m.milestone_key);

  const TYPE_LABELS: Record<string, string> = { devlet: "Devlet", ozel: "Özel", vakif: "Vakıf" };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/okullar" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Okullar
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{school.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[school.district, school.city].filter(Boolean).join(", ")}
                </span>
                <span>{TYPE_LABELS[school.school_type] ?? school.school_type}</span>
                {school.partnership_start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Ortaklık: {formatDate(school.partnership_start_date)}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <SchoolStatusBadge status={school.status} />
              </div>
            </div>
          </div>
          {canWrite && <SchoolDetailActions school={school} />}
        </div>

        {school.notes && (
          <div className="mt-4 pt-4 border-t text-sm text-gray-600 whitespace-pre-wrap">
            {school.notes}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coordinators */}
          <section className="bg-white rounded-xl border p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              Koordinatörler
            </h2>
            {coords.length === 0 ? (
              <p className="text-sm text-gray-400">Henüz koordinatör eklenmemiş.</p>
            ) : (
              <div className="space-y-2">
                {coords.map((coord) => (
                  <div key={coord.id} className="flex items-start justify-between py-2 px-3 rounded-lg bg-gray-50">
                    <div>
                      <Link href={`/kisiler/${coord.contact.id}`} className="font-medium text-sm text-gray-800 hover:text-blue-600">
                        {coord.contact.full_name}
                      </Link>
                      {coord.contact.title && (
                        <p className="text-xs text-gray-400">{coord.contact.title}</p>
                      )}
                      <div className="flex gap-3 mt-1">
                        {coord.contact.email && (
                          <a href={`mailto:${coord.contact.email}`} className="text-xs text-gray-400 hover:text-blue-600">{coord.contact.email}</a>
                        )}
                        {coord.contact.phone && (
                          <a href={`tel:${coord.contact.phone}`} className="text-xs text-gray-400 hover:text-blue-600">{coord.contact.phone}</a>
                        )}
                      </div>
                    </div>
                    {coord.is_primary && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">Birincil</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Assignments */}
          <section className="bg-white rounded-xl border p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              Atamalar ({assignments.length})
            </h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-400">Henüz atama yapılmamış.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => {
                  const statusCfg = ASSIGNMENT_STATUS[a.status] ?? { label: a.status, color: "bg-gray-50 text-gray-500" };
                  return (
                    <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.training?.title ?? "—"}</p>
                        {a.trainer?.contact?.full_name && (
                          <p className="text-xs text-gray-400">{a.trainer.contact.full_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.scheduled_date && (
                          <span className="text-xs text-gray-400">{formatDate(a.scheduled_date)}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Contracts */}
          {contracts.length > 0 && (
            <section className="bg-white rounded-xl border p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                Sözleşmeler
              </h2>
              <div className="space-y-2">
                {contracts.map((c) => {
                  const statusCfg = CONTRACT_STATUS[c.status] ?? { label: c.status, color: "bg-gray-50 text-gray-500" };
                  return (
                    <div key={c.id} className="py-2.5 px-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {c.package?.name ?? "Özel Sözleşme"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>{formatDate(c.start_date)} → {formatDate(c.end_date)}</span>
                        <span className="font-medium text-gray-600">{formatCurrency(c.contract_value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <section className="bg-white rounded-xl border p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Son Aktiviteler</h2>
              <div className="space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 text-sm py-1.5">
                    <span className="text-base shrink-0">{ACTIVITY_ICONS[a.activity_type] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate">{a.summary}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(a.activity_date)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Okul Ziyaretleri / Toplantılar */}
          <section className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Toplantılar & Ziyaretler</h2>
              <Link href="/toplantilar" className="text-xs font-medium text-blue-600 hover:underline">
                + Toplantı ekle
              </Link>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-gray-400">
                Bu okula bağlı toplantı yok. Toplantılar&apos;dan tür &quot;Okul Ziyareti&quot; seçip bu okulu bağlayın.
              </p>
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <div key={m.id} className="rounded-md border-l-2 border-blue-300 bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">🏫 {m.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(m.meeting_date)}</span>
                    </div>
                    {m.attendees.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-500">{m.attendees.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — Onboarding */}
        <div>
          <section className="bg-white rounded-xl border p-5 sticky top-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Onboarding</h2>
            <OnboardingProgress completedKeys={completedMilestoneKeys} />
          </section>
        </div>
      </div>
    </div>
  );
}
