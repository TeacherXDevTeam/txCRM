"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Mail, Phone, BookOpen, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrainerForm } from "@/components/trainers/trainer-form";
import type { Database } from "@/types/database";

type Trainer = Database["public"]["Tables"]["trainers"]["Row"] & {
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    organization: string | null;
  } | null;
  upcoming_assignments: {
    id: string;
    scheduled_date: string | null;
    school: { name: string } | null;
    training: { title: string } | null;
  }[];
  total_assignments: number;
};

type Contact = { id: string; full_name: string; email: string | null };

interface TrainersClientProps {
  trainers:  Trainer[];
  contacts:  Contact[];
  canWrite:  boolean;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function TrainersClient({ trainers, contacts, canWrite }: TrainersClientProps) {
  const router  = useRouter();
  const [search, setSearch]       = useState("");
  const [expertiseFilter, setExp] = useState("");
  const [statusFilter, setStatus] = useState("aktif");
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Trainer | null>(null);

  // Collect all expertise areas
  const allExpertise = [...new Set(trainers.flatMap((t) => t.expertise_areas))].sort();

  const filtered = trainers.filter((t) => {
    const q = search.toLowerCase();
    const matchQ      = !q || t.contact?.full_name.toLowerCase().includes(q) || t.expertise_areas.some((e) => e.toLowerCase().includes(q)) || t.bio?.toLowerCase().includes(q);
    const matchExp    = !expertiseFilter || t.expertise_areas.includes(expertiseFilter);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchQ && matchExp && matchStatus;
  });

  async function deleteTrainer(id: string) {
    if (!confirm("Bu eğitmeni silmek istediğinizden emin misiniz?")) return;
    await createClient().from("trainers").delete().eq("id", id);
    router.refresh();
  }

  const aktif = trainers.filter((t) => t.status === "aktif").length;
  const pasif  = trainers.filter((t) => t.status === "pasif").length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{aktif}</p>
          <p className="text-xs text-gray-500 mt-1">Aktif eğitmen</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{pasif}</p>
          <p className="text-xs text-gray-500 mt-1">Pasif eğitmen</p>
        </div>
        <div className="bg-white border rounded-xl p-4 hidden sm:block">
          <p className="text-2xl font-bold text-gray-900">{allExpertise.length}</p>
          <p className="text-xs text-gray-500 mt-1">Uzmanlık alanı</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Eğitmen ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={expertiseFilter} onChange={(e) => setExp(e.target.value)} className="w-full sm:w-52">
          <option value="">Tüm uzmanlıklar</option>
          {allExpertise.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-32">
          <option value="">Tümü</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Yeni Eğitmen
          </Button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Eğitmen bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-blue-600">
                      {t.contact?.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.contact?.full_name ?? "—"}</p>
                    {t.contact?.title && <p className="text-xs text-gray-500">{t.contact.title}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.status === "aktif" ? "Aktif" : "Pasif"}
                  </span>
                  {canWrite && (
                    <>
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1 text-gray-400 hover:text-blue-600 ml-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteTrainer(t.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Contact info */}
              {(t.contact?.email || t.contact?.phone) && (
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {t.contact.email && (
                    <a href={`mailto:${t.contact.email}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Mail className="h-3.5 w-3.5" />{t.contact.email}
                    </a>
                  )}
                  {t.contact.phone && (
                    <a href={`tel:${t.contact.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5" />{t.contact.phone}
                    </a>
                  )}
                </div>
              )}

              {/* Bio */}
              {t.bio && <p className="text-sm text-gray-600 line-clamp-2">{t.bio}</p>}

              {/* Expertise */}
              {t.expertise_areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.expertise_areas.map((area) => (
                    <span key={area} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {area}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats & upcoming */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t.total_assignments} atama
                  </span>
                </div>
                {t.upcoming_assignments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">Yaklaşan:</p>
                    {t.upcoming_assignments.slice(0, 2).map((a) => (
                      <div key={a.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate">{a.training?.title}</span>
                        <span className="text-gray-400 shrink-0">·</span>
                        <span className="text-gray-400 shrink-0">{a.school?.name}</span>
                        {a.scheduled_date && <span className="ml-auto text-gray-400 shrink-0">{fmtDate(a.scheduled_date)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">{filtered.length} eğitmen</p>

      {showForm && (
        <TrainerForm
          trainer={editing ? { ...editing, contact: editing.contact ?? undefined } : undefined}
          contacts={contacts}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
