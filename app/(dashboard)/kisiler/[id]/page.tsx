import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Tag, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContactTypeBadge } from "@/components/contacts/contact-type-badge";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type CoordRow   = { is_primary: boolean; school: { id: string; name: string; status: string } };
type LeadRow    = { id: string; stage: string; estimated_value: number | null; created_at: string };
type TrainerRow = { id: string; expertise_areas: string[] | null; status: string; bio: string | null };

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: rawContact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .single();

  const contact = rawContact as unknown as ContactRow | null;
  if (!contact) notFound();

  // Related records in parallel
  const [{ data: rawCoords }, { data: rawLeads }, { data: rawTrainer }] = await Promise.all([
    supabase
      .from("coordinators")
      .select("is_primary, school:schools(id, name, status)")
      .eq("contact_id", params.id),
    supabase
      .from("leads")
      .select("id, stage, estimated_value, created_at")
      .eq("contact_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trainers")
      .select("id, expertise_areas, status, bio")
      .eq("contact_id", params.id)
      .maybeSingle(),
  ]);

  const coordinatorRows = rawCoords as unknown as CoordRow[] | null;
  const leads           = rawLeads  as unknown as LeadRow[]  | null;
  const trainerRow      = rawTrainer as unknown as TrainerRow | null;

  const STAGE_LABELS: Record<string, string> = {
    yeni_baglanti:       "Yeni Bağlantı",
    ilk_gorusme:         "İlk Görüşme",
    ihtiyac_analizi:     "İhtiyaç Analizi",
    teklif_hazirlaniyor: "Teklif Hazırlanıyor",
    teklif_verildi:      "Teklif Verildi",
    gorusme_yapildi:     "Görüşme Yapıldı",
    kapandi_kazanildi:   "Kazanıldı",
    kapandi_kaybedildi:  "Kaybedildi",
  };

  const STAGE_COLORS: Record<string, string> = {
    kapandi_kazanildi:  "text-green-700 bg-green-50",
    kapandi_kaybedildi: "text-red-700 bg-red-50",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/kisiler" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Kişiler
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
              {contact.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contact.full_name}</h1>
              {contact.title && <p className="text-gray-500 text-sm">{contact.title}</p>}
              <div className="mt-1.5">
                <ContactTypeBadge type={contact.contact_type} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              {contact.phone}
            </a>
          )}
          {contact.organization && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
              {contact.organization}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="h-4 w-4 shrink-0" />
            {formatDate(contact.created_at)}
          </div>
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Schools */}
      {coordinatorRows && coordinatorRows.length > 0 && (
        <section className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            Koordinatör Olduğu Okullar
          </h2>
          <div className="space-y-2">
            {coordinatorRows.map((row, i) => {
              const school = row.school;
              return (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <Link href={`/okullar/${school.id}`} className="font-medium text-gray-800 hover:text-blue-600 text-sm">
                    {school.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    {row.is_primary && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Birincil</span>
                    )}
                    <span className="text-xs text-gray-400 capitalize">{school.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trainer profile */}
      {trainerRow && (
        <section className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-400" />
            Eğitmen Profili
          </h2>
          {trainerRow.bio && <p className="text-sm text-gray-600 mb-3">{trainerRow.bio}</p>}
          {trainerRow.expertise_areas && (trainerRow.expertise_areas as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(trainerRow.expertise_areas as string[]).map((area) => (
                <span key={area} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  {area.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Leads */}
      {leads && leads.length > 0 && (
        <section className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Lead Geçmişi</h2>
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-600"}`}>
                  {STAGE_LABELS[lead.stage] ?? lead.stage}
                </span>
                <div className="flex items-center gap-4 text-gray-500">
                  {lead.estimated_value && (
                    <span>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(lead.estimated_value)}</span>
                  )}
                  <span className="text-xs">{formatDate(lead.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
