"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Calendar, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AssignmentForm } from "@/components/assignments/assignment-form";
import { STATUS_CONFIG } from "@/components/assignments/assignment-config";
import type { Database } from "@/types/database";

type Assignment = Database["public"]["Tables"]["assignments"]["Row"] & {
  school:   { id: string; name: string } | null;
  training: { id: string; title: string } | null;
  trainer:  { id: string; contact: { full_name: string } | null } | null;
  assignee: { id: string; full_name: string } | null;
};

type School   = { id: string; name: string };
type Training = { id: string; title: string };
type Trainer  = { id: string; contact: { full_name: string } | null };
type Member   = { id: string; full_name: string };

interface AssignmentsClientProps {
  assignments: Assignment[];
  schools:     School[];
  trainings:   Training[];
  trainers:    Trainer[];
  members:     Member[];
  canWrite:    boolean;
}

function isOverdue(a: Assignment) {
  return a.status === "planlanmis" && a.scheduled_date && new Date(a.scheduled_date) < new Date();
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function AssignmentsClient({ assignments, schools, trainings, trainers, members, canWrite }: AssignmentsClientProps) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [schoolFilter, setSchool]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Assignment | null>(null);

  const today = new Date();
  const overdue = assignments.filter(isOverdue);

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      a.school?.name.toLowerCase().includes(q) ||
      a.training?.title.toLowerCase().includes(q) ||
      a.trainer?.contact?.full_name?.toLowerCase().includes(q) ||
      a.assignee?.full_name?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchSchool = !schoolFilter || a.school_id === schoolFilter;
    return matchQ && matchStatus && matchSchool;
  });

  // Summary counts
  const counts = {
    planlanmis:   assignments.filter((a) => a.status === "planlanmis").length,
    devam_ediyor: assignments.filter((a) => a.status === "devam_ediyor").length,
    tamamlandi:   assignments.filter((a) => a.status === "tamamlandi").length,
    iptal:        assignments.filter((a) => a.status === "iptal").length,
  };

  async function deleteAssignment(id: string) {
    if (!confirm("Bu atamayı silmek istediğinizden emin misiniz?")) return;
    await createClient().from("assignments").delete().eq("id", id);
    router.refresh();
  }

  async function updateStatus(id: string, status: Assignment["status"]) {
    await createClient().from("assignments").update({ status }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["planlanmis", "devam_ediyor", "tamamlandi", "iptal"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(statusFilter === s ? "" : s)}
            className={`bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm ${statusFilter === s ? "ring-2 ring-blue-500" : ""}`}
          >
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${STATUS_CONFIG[s].color}`}>
              {STATUS_CONFIG[s].label}
            </p>
          </button>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{overdue.length} atama gecikmeli</span> — planlanmış tarih geçmiş, henüz tamamlanmamış.
          </p>
          <button onClick={() => setStatus("planlanmis")} className="ml-auto text-xs text-red-600 hover:underline shrink-0">
            Göster
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Okul, eğitim veya kişi ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={schoolFilter} onChange={(e) => setSchool(e.target.value)} className="w-full sm:w-52">
          <option value="">Tüm okullar</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40">
          <option value="">Tüm durumlar</option>
          {(["planlanmis", "devam_ediyor", "tamamlandi", "iptal"] as const).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Yeni Atama
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Okul</th>
              <th className="px-4 py-3 text-left">Eğitim</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Eğitmen</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Sorumlu</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Periyot</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Tarih</th>
              <th className="px-4 py-3 text-left">Durum</th>
              {canWrite && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Atama bulunamadı.</td>
              </tr>
            ) : (
              filtered.map((a) => {
                const overdue = isOverdue(a);
                return (
                  <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        {a.school?.name ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                      <span className="truncate block">{a.training?.title ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {a.trainer?.contact?.full_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {a.assignee?.full_name ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                      {a.period ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className={overdue ? "text-red-600 font-medium" : ""}>{fmtDate(a.scheduled_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <select
                          value={a.status}
                          onChange={(e) => updateStatus(a.id, e.target.value as Assignment["status"])}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_CONFIG[a.status].color}`}
                        >
                          {(["planlanmis", "devam_ediyor", "tamamlandi", "iptal"] as const).map((s) => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[a.status].color}`}>
                          {STATUS_CONFIG[a.status].label}
                        </span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1 text-gray-400 hover:text-blue-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteAssignment(a.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} atama gösteriliyor</p>

      {showForm && (
        <AssignmentForm
          assignment={editing ?? undefined}
          schools={schools}
          trainings={trainings}
          trainers={trainers}
          members={members}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
