"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutList, Columns, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadCard, type LeadCardData } from "@/components/leads/lead-card";
import { LeadForm } from "@/components/leads/lead-form";
import { STAGES, CLOSED_STAGES, ALL_STAGES, STAGE_LABEL, SOURCE_LABEL } from "@/components/leads/lead-stage-config";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LeadsBoardProps {
  leads: LeadCardData[];
  canWrite: boolean;
}

export function LeadsBoard({ leads, canWrite }: LeadsBoardProps) {
  const [view, setView]            = useState<"kanban" | "list">("kanban");
  const [showForm, setShowForm]    = useState(false);
  const [defaultStage, setDefault] = useState("yeni_baglanti");
  const [search, setSearch]        = useState("");

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return !q ||
      l.contact.full_name.toLowerCase().includes(q) ||
      l.contact.organization?.toLowerCase().includes(q);
  });

  const activeLeads = filtered.filter((l) => !l.stage.startsWith("kapandi"));
  const closedLeads = filtered.filter((l) =>  l.stage.startsWith("kapandi"));

  const totalValue = activeLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const wonValue   = closedLeads
    .filter((l) => l.stage === "kapandi_kazanildi")
    .reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const overdueCount = activeLeads.filter(
    (l) => l.next_action_date && new Date(l.next_action_date) < new Date()
  ).length;

  function openNewLead(stage = "yeni_baglanti") {
    setDefault(stage);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Aktif Lead</p>
          <p className="text-2xl font-bold text-gray-900">{activeLeads.length}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Pipeline Değeri</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Kazanılan</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Geciken Aksiyon</p>
          <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Kişi veya kurum ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Columns className="h-4 w-4" /> Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <LayoutList className="h-4 w-4" /> Liste
            </button>
          </div>
          {canWrite && (
            <Button onClick={() => openNewLead()} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Yeni Lead
            </Button>
          )}
        </div>
      </div>

      {/* ── Kanban ── */}
      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = filtered.filter((l) => l.stage === stage.key);
              const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
              return (
                <div key={stage.key} className="w-64 shrink-0">
                  <div className={`rounded-t-lg border-t-4 ${stage.color} bg-white border-x border-b border-gray-200 px-3 py-2.5 flex items-center justify-between`}>
                    <div>
                      <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                      {stageValue > 0 && <p className="text-xs text-gray-400">{formatCurrency(stageValue)}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.count_color}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className={`${stage.bg} border-x border-b border-gray-200 rounded-b-lg min-h-[120px] p-2 space-y-2`}>
                    {stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} canWrite={canWrite} stages={ALL_STAGES} />
                    ))}
                    {canWrite && (
                      <button
                        onClick={() => openNewLead(stage.key)}
                        className="w-full text-xs text-gray-400 hover:text-blue-600 py-2 flex items-center justify-center gap-1 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ekle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Closed column */}
            <div className="w-64 shrink-0">
              <div className="rounded-t-lg border-t-4 border-t-gray-300 bg-white border-x border-b border-gray-200 px-3 py-2.5">
                <span className="text-sm font-medium text-gray-500">Kapandı</span>
              </div>
              <div className="bg-gray-50 border-x border-b border-gray-200 rounded-b-lg min-h-[120px] p-2 space-y-2">
                {CLOSED_STAGES.map((cs) => {
                  const csLeads = filtered.filter((l) => l.stage === cs.key);
                  if (csLeads.length === 0) return null;
                  return (
                    <div key={cs.key}>
                      <p className={`text-xs font-medium px-2 py-0.5 rounded mb-1.5 w-fit ${cs.color}`}>{cs.label}</p>
                      <div className="space-y-2">
                        {csLeads.map((lead) => (
                          <LeadCard key={lead.id} lead={lead} canWrite={canWrite} stages={ALL_STAGES} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {closedLeads.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Henüz yok</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {view === "list" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kişi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Aşama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Kaynak</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Değer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Aksiyon Tarihi</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Sonuç bulunamadı.</td></tr>
              ) : (
                filtered.map((lead) => {
                  const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date();
                  const isClosed  = lead.stage.startsWith("kapandi");
                  return (
                    <tr key={lead.id} className={`hover:bg-gray-50 ${isClosed ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.contact.full_name}</p>
                        {lead.contact.organization && <p className="text-xs text-gray-400">{lead.contact.organization}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          lead.stage === "kapandi_kazanildi"  ? "bg-green-100 text-green-700" :
                          lead.stage === "kapandi_kaybedildi" ? "bg-red-100 text-red-700"    :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {STAGE_LABEL[lead.stage] ?? lead.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                        {SOURCE_LABEL[lead.source] ?? lead.source}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                        {lead.estimated_value ? formatCurrency(lead.estimated_value) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-xs hidden md:table-cell ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        {lead.next_action_date ? formatDate(lead.next_action_date) : "—"}
                        {isOverdue ? " ⚠️" : ""}
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && <ListRowActions lead={lead} />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500">
            {filtered.length} lead
          </div>
        </div>
      )}

      {showForm && (
        <LeadForm defaultStage={defaultStage} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function ListRowActions({ lead }: { lead: LeadCardData }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);

  async function handleDelete() {
    if (!confirm("Bu lead'i silmek istediğinizden emin misiniz?")) return;
    const supabase = createClient();
    await supabase.from("leads").delete().eq("id", lead.id);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setShowEdit(true)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Düzenle">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Sil">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {showEdit && <LeadForm lead={lead as any} onClose={() => setShowEdit(false)} />}
    </>
  );
}
